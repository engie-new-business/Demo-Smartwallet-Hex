let express = require('express');
let request = require('request-promise');
let bodyParser = require('body-parser');
let cors = require('cors')
let Web3 = require('web3')
const {
  TypedDataUtils
} = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');

const network = process.env.NETWORK || 'mainnet'
const chainId = process.env.CHAINID || 1
const apikey = process.env.APIKEY
const rocksideURL = process.env.APIURL || 'https://api.rockside.io'

const contractAddress = process.env.CONTRACT
const port = process.env.PORT || '8000'
const rpc = process.env.RPC

const multiSend = process.env.MULTISEND || '0x8D29bE29923b68abfDD21e541b9374737B49cdAD'

let web3 = new Web3(rpc)

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

  const params = await fetchParams(gnosis);
  const nonce = await getGnosisNonce(gnosis);

  let tx = {}
  tx.to = multiSend
  tx.value = 0
  tx.data = data
  tx.operation = 1
  tx.safeTxGas = 100000 // should be estimated
  tx.baseGas = 40000
  tx.gasPrice = params.speeds.fast.gas_price
  tx.gasToken = '0x0000000000000000000000000000000000000000'
  tx.refundReceiver = params.speeds.fast.relayer
  tx.nonce = nonce

  const message = gnosisMessage(gnosis, tx)
  const signature = sign(signerPrivateKey, message)
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
  }, [tx.to, tx.value, tx.data, tx.operation, tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, signature]);

  const trackingId = await relay(gnosis, execTransactionData, 'fast')
  res.status(200).json({
    trackingId
  })
}

async function fetchParams(gnosis) {
  const response = await request({
    uri: `${rocksideURL}/ethereum/${network}/relay/${gnosis}/params?apikey=${apikey}`,
    method: 'GET',
    json: true,
  })

  return response;
}

async function getGnosisNonce(gnosis) {
  return await web3.eth.call({
    to: gnosis,
    data: "0xaffed0e0"
  })
}

function gnosisMessage(gnosis, tx) {
  const domain = {
    verifyingContract: gnosis,
  };

  const eip712DomainType = [{
      name: 'verifyingContract',
      type: 'address'
    }
  ];
  const encodedDomain = TypedDataUtils.encodeData(
    'EIP712Domain',
    domain, {
      EIP712Domain: eip712DomainType
    }
  );
  const hashedDomain = ethUtil.keccak256(encodedDomain);
  const messageTypes = {
    'SafeTx': [
      {name: "to", type: "address"},
      {name: "value", type: "uint256"},
      {name: "data", type: "bytes"},
      {name: "operation", type: "uint8"},
      {name: "safeTxGas", type: "uint256"},
      {name: "baseGas", type: "uint256"},
      {name: "gasPrice", type: "uint256"},
      {name: "gasToken", type: "address"},
      {name: "refundReceiver", type: "address"},
      {name: "nonce", type: "uint256"},
    ]
  }

  const encodedMessage = TypedDataUtils.encodeData(
    'SafeTx',
    tx,
    messageTypes,
  );

  const hashedMessage = ethUtil.keccak256(encodedMessage);

  const hash = ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      hashedDomain,
      hashedMessage,
    ])
  );
  return hash
}

function sign(signerPrivateKey, hash) {
  const sig = ethUtil.ecsign(hash, Buffer.from(signerPrivateKey.substring(2), 'hex'));
  const signature = ethUtil.toRpcSig(sig.v, sig.r, sig.s);
  return signature
}

async function relay(gnosis, data, speed) {
  const requestBody = {
    data: data,
    speed: speed
  };

  const response = await request({
    method: 'POST',
    uri: `${rocksideURL}/ethereum/${network}/relay/${gnosis}?apikey=${apikey}`,
    body: requestBody,
    json: true,
  })

  return response.tracking_id;
}

async function getRocksideTx(req, res) {
  const response = await request({
    uri: `${rocksideURL}/ethereum/${network}/transactions/${req.params.trackingId}?apikey=${apikey}`,
    method: 'GET',
    json: true,
  })

  res.json(response)
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
