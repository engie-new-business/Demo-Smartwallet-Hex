let express = require('express');
let request = require('request-promise');
let bodyParser = require('body-parser');
let cors = require('cors')
let Web3 = require('web3')
let web3 = new Web3(Web3.givenProvider)
const {
  TypedDataUtils
} = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');

const contractAddress = process.env.CONTRACT
const port = process.env.PORT || '8000'

const multiSend = process.env.MULTISEND
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY
const admin = ethUtil.bufferToHex(ethUtil.privateToAddress(adminPrivateKey));

const forwarderAddress = process.env.FORWARDER;

const { hashForwarderMessage } = require('./forwarder');
const { hashGnosisMessage, getGnosisNonce } = require('./gnosis');
const rockside = require('./rockside');

async function setup(req, res) {
  res.json({
    hexContract: contractAddress,
  })
}

async function batchStakeStart(req, res) {
  const batch = req.body.batch
  const gnosis = req.body.gnosis
  const signerPrivateKey = req.body.signer
  const signer = ethUtil.bufferToHex(ethUtil.privateToAddress(signerPrivateKey));

  let dataForMultisend = "0x"
  for (var i = 0; i < batch.length; i++) {
    let dataForContract = web3.eth.abi.encodeFunctionCall({
      name: 'stakeStart',
      type: 'function',
      inputs: [{
        type: 'uint256',
        name: 'newStakedHearts'
      }, {
        type: 'uint256',
        name: 'newStakedDays'
      }]
    }, [batch[i].newStakedHearts, batch[i].newStakedDays]);

    let pack = web3.utils.encodePacked({type:'uint8', value:0}).slice(2) // operation
            + web3.utils.encodePacked({type:'address', value:contractAddress}).slice(2) // to
            + web3.utils.encodePacked({type:'uint256', value:0}).slice(2) // value
            + web3.utils.encodePacked({type:'uint256', value:dataForContract.slice(2).length/2}).slice(2) // data.length
            + web3.utils.encodePacked({type:'bytes', value:dataForContract}).slice(2) // data
    dataForMultisend = dataForMultisend + pack
  }

  const data = web3.eth.abi.encodeFunctionCall({
    name: 'multiSend',
    type: 'function',
    inputs: [
      {name: 'transactions',type: 'bytes'},
    ]
  }, [dataForMultisend]);

  const nonceGnosis = await getGnosisNonce(gnosis);

  let tx = {}
  tx.to = multiSend
  tx.value = 0
  tx.data = data
  tx.operation = 1
  tx.safeTxGas = 0
  tx.baseGas = 0
  tx.gasPrice = 0
  tx.gasToken = '0x0000000000000000000000000000000000000000'
  tx.refundReceiver = '0x0000000000000000000000000000000000000000'
  tx.nonce = nonceGnosis

  const message = hashGnosisMessage(gnosis, tx)
  const signatureGnosis = sign(signerPrivateKey, message)
  const execTransactionData = web3.eth.abi.encodeFunctionCall({
    name: 'execTransaction',
    type: 'function',
    inputs: [
      {name: 'to',type: 'address'},
      {name: 'value',type: 'uint256'},
      {name: 'data',type: 'bytes'},
      {name: 'operation',type: 'uint8'},
      {name: 'safeTxGas',type: 'uint256'},
      {name: 'baseGas',type: 'uint256'},
      {name: 'gasPrice',type: 'uint256'},
      {name: 'gasToken',type: 'address'},
      {name: 'refundReceiver',type: 'address'},
      {name: 'signatures',type: 'bytes'},
    ]
  }, [tx.to, tx.value, tx.data, tx.operation, tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, signatureGnosis]);

  const {
    nonce,
    gas_prices: gasPrice
  } = await rockside.fetchForwardParams(forwarderAddress, admin)

  const hash = hashForwarderMessage(forwarderAddress, admin, gnosis, execTransactionData, nonce)
  const signature = await sign(adminPrivateKey, hash)
  const trackingId = await rockside.forward(forwarderAddress, admin, gnosis, execTransactionData, nonce, signature, 'fast', gasPrice.fast)
  res.status(200).json({
    trackingId
  })
}

function sign(signerPrivateKey, hash) {
  const sig = ethUtil.ecsign(hash, Buffer.from(signerPrivateKey.substring(2), 'hex'));
  const signature = ethUtil.toRpcSig(sig.v, sig.r, sig.s);
  return signature
}

async function getRocksideTx(req, res) {
  res.json(await rockside.getTransaction(req.params.trackingId))
}

function wrap(handler) {
  return (req, res, next) => {
    return Promise
      .resolve(handler(req, res))
      .catch(next);
  }
}

let app = express();

app.use(bodyParser.json())
app.use(cors())

app.get('/setup', wrap(setup))
app.get('/tx/:trackingId', wrap(getRocksideTx))
app.post('/batch/stakeStart', batchStakeStart)

app.set('trust proxy', true);
app.use(function(err, req, res, next) {
  res.status(500).json({
    error: err.message
  })
});
app.listen(port);
