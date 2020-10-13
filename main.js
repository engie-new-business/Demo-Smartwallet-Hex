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

const network = process.env.NETWORK

const forwarderAddress = process.env.FORWARDER;
const contractAddress = process.env.CONTRACT; // hex smart contract address
const port = process.env.PORT || '8000'

const smartwalletMainnetImpl = '0x89D3478550a82efa26ee0B4Aab7025b5Ef154fa7'
const smartwalletRopstenImpl = '0x143936adBA80D25625E7Ff3899f157507397b245'
const factoryMainnet = '0x7a5b998c2b3889e003a4c7bfd1653ed7dbd2ea47'
const factoryRopsten = '0x8781Ba37f5537680400aC64C374794961d8019d6'
const { hashForwarderMessage } = require('./forwarder');
const rockside = require('./rockside');

async function setup(req, res) {
  res.json({
    hexContract: contractAddress,
  })
}

async function deploySmartwallet(req, res) {
  const owner = req.body.owner
  const signerPrivateKey = req.body.signer
  const signer = ethUtil.bufferToHex(ethUtil.privateToAddress(signerPrivateKey));

  const implementation = (network == 'mainnet') ? smartwalletMainnetImpl: smartwalletRopstenImpl
  const factory = (network == 'mainnet') ? factoryMainnet: factoryRopsten
  const salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
  const version = "0x0000000000000000000000000000000000000000000000000000000000000000"

  const initData = web3.eth.abi.encodeFunctionCall({
    name: 'initialize',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'forwarder'
    }]
  }, [forwarderAddress]);

  const dataForFactory = web3.eth.abi.encodeFunctionCall({
    name: 'createProxyWithNonce',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'owner'
    }, {
      type: 'bytes32',
      name: 'version'
    }, {
      type: 'address',
      name: 'implementation'
    }, {
      type: 'bytes',
      name: 'data'
    }, {
      type: 'bytes32',
      name: 'saltNonce'
    }]
  }, [owner, version, implementation, initData, salt]);

  const {
    nonce,
    gas_prices: gasPrice
  } = await rockside.fetchForwardParams(forwarderAddress, signer);

  const hash = hashForwarderMessage(forwarderAddress, signer, factory, dataForFactory, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await rockside.forward(forwarderAddress, signer, factory, dataForFactory, nonce, signature, 'fast', gasPrice.fast)
  res.status(200).json({
    trackingId
  })
}

async function stakeStart(req, res) {
  const newStakedHearts = req.body.newStakedHearts
  const newStakedDays = req.body.newStakedDays
  const smartwallet = req.body.smartwallet
  const signerPrivateKey = req.body.signer
  const signer = ethUtil.bufferToHex(ethUtil.privateToAddress(signerPrivateKey));

  const dataForContract = web3.eth.abi.encodeFunctionCall({
    name: 'stakeStart',
    type: 'function',
    inputs: [{
      type: 'uint256',
      name: 'newStakedHearts'
    }, {
      type: 'uint256',
      name: 'newStakedDays'
    }]
  }, [newStakedHearts, newStakedDays]);

  const {
    nonce,
    gas_prices: gasPrice
  } = await rockside.fetchForwardParams(forwarderAddress, signer);

  const message = makeMessage(0, dataForContract)
  const hash = hashForwarderMessage(forwarderAddress, signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await rockside.forward(forwarderAddress, signer, smartwallet, message, nonce, signature, 'fast', gasPrice.fast)
  res.status(200).json({
    trackingId
  })
}

async function batchStakeStart(req, res) {
  const batch = req.body.batch
  const smartwallet = req.body.smartwallet
  const signerPrivateKey = req.body.signer
  const signer = ethUtil.bufferToHex(ethUtil.privateToAddress(signerPrivateKey));

  let calls = []
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
    calls.push([contractAddress, 0, dataForContract])
  }

  const {
    nonce,
    gas_prices: gasPrice
  } = await rockside.fetchForwardParams(forwarderAddress, signer);

  const message = makeBatchMessage(calls)
  const hash = hashForwarderMessage(forwarderAddress, signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await rockside.forward(forwarderAddress, signer, smartwallet, message, nonce, signature, 'fast', gasPrice.fast)
  res.status(200).json({
    trackingId
  })
}

async function stakeGoodAccounting(req, res) {
  const stakerAddr = req.body.stakerAddr
  const stakeIndex = req.body.stakeIndex
  const stakeIdParam = req.body.stakeIdParam
  const smartwallet = req.body.smartwallet
  const signerPrivateKey = req.body.signer
  const signer = ethUtil.bufferToHex(ethUtil.privateToAddress(signerPrivateKey));

  const dataForContract = web3.eth.abi.encodeFunctionCall({
    name: 'stakeGoodAccounting',
    type: 'function',
    inputs: [{
      name: "stakerAddr",
      type: "address"
    }, {
      name: "stakeIndex",
      type: "uint256"
    }, {
      name: "stakeIdParam",
      type: "uint40"
    }],
  }, [stakerAddr, stakeIndex, stakeIdParam]);

  const {
    nonce,
    gas_prices: gasPrice
  } = await rockside.fetchForwardParams(forwarderAddress, signer);

  const message = makeMessage(0, dataForContract)
  const hash = hashForwarderMessage(forwarderAddress, signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await rockside.forward(forwarderAddress, signer, smartwallet, message, nonce, signature, 'fast', gasPrice.fast)
  res.status(200).json({
    trackingId
  })
}

async function stakeEnd(req, res) {
  const stakeIndex = req.body.stakeIndex
  const stakeIdParam = req.body.stakeIdParam
  const smartwallet = req.body.smartwallet
  const signerPrivateKey = req.body.signer
  const signer = ethUtil.bufferToHex(ethUtil.privateToAddress(signerPrivateKey));

  const dataForContract = web3.eth.abi.encodeFunctionCall({
    name: 'stakeEnd',
    type: 'function',
    inputs: [{
      name: "stakeIndex",
      type: "uint256"
    }, {
      name: "stakeIdParam",
      type: "uint40"
    }],
  }, [stakeIndex, stakeIdParam]);

  const {
    nonce,
    gas_prices: gasPrice
  } = await rockside.fetchForwardParams(forwarderAddress, signer);

  const message = makeMessage(0, dataForContract)
  const hash = hashForwarderMessage(forwarderAddress, signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await rockside.forward(forwarderAddress, signer, smartwallet, message, nonce, signature, 'fast', gasPrice.fast)
  res.status(200).json({
    trackingId
  })
}

async function xfLobbyEnter(req, res) {
  let referrerAddr = req.body.referrerAddr
  if (!ethUtil.isValidAddress(referrerAddr)) {
    referrerAddr = "0x0000000000000000000000000000000000000000"
  }

  const value = req.body.value
  const smartwallet = req.body.smartwallet
  const signerPrivateKey = req.body.signer
  const signer = ethUtil.bufferToHex(ethUtil.privateToAddress(signerPrivateKey));

  const dataForContract = web3.eth.abi.encodeFunctionCall({
    name: 'xfLobbyEnter',
    type: 'function',
    inputs: [{
      name: "referrerAddr",
      type: "address"
    }],
  }, [referrerAddr]);

  const {
    nonce,
    gas_prices: gasPrice
  } = await rockside.fetchForwardParams(forwarderAddress, signer);

  const message = makeMessage(value, dataForContract)
  const hash = hashForwarderMessage(forwarderAddress, signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await rockside.forward(forwarderAddress, signer, smartwallet, message, nonce, signature, 'fast', gasPrice.fast)
  res.status(200).json({
    trackingId
  })
}

async function xfLobbyExit(req, res) {
  const enterDay = req.body.enterDay
  const count = req.body.count
  const smartwallet = req.body.smartwallet
  const signerPrivateKey = req.body.signer
  const signer = ethUtil.bufferToHex(ethUtil.privateToAddress(signerPrivateKey));

  const dataForContract = web3.eth.abi.encodeFunctionCall({
    name: 'xfLobbyExit',
    type: 'function',
    inputs: [{
      name: "enterDay",
      type: "uint256"
    }, {
      name: "count",
      type: "uint256"
    }],
  }, [enterDay, count]);
  const {
    nonce,
    gas_prices: gasPrice
  } = await rockside.fetchForwardParams(forwarderAddress, signer);

  const message = makeMessage(0, dataForContract)
  const hash = hashForwarderMessage(forwarderAddress, signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await rockside.forward(forwarderAddress, signer, smartwallet, message, nonce, signature, 'fast', gasPrice.fast)
  res.status(200).json({
    trackingId
  })
}

function makeMessage(value, data) {
  const dataForSmartwallet = web3.eth.abi.encodeFunctionCall({
    name: 'execute',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'to'
    }, {
      type: 'uint256',
      name: 'value'
    }, {
      type: 'bytes',
      name: 'data'
    }]
  }, [contractAddress, value, data]);
  return dataForSmartwallet
}

function makeBatchMessage(batch) {
  const dataForSmartwallet = web3.eth.abi.encodeFunctionCall({
    name: 'batch',
    type: 'function',
    inputs: [{
      components: [{
        name: "to",
        type: "address"
      }, {
        name: "value",
        type: "uint256"
      }, {
        name: "data",
        type: "bytes"
      }],
      name: "calls",
      type: "tuple[]"
    }]
  }, [batch]);
  return dataForSmartwallet
}

async function sign(signerPrivateKey, hash) {
  const sig = await ethUtil.ecsign(hash, Buffer.from(signerPrivateKey.substring(2), 'hex'));
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
app.post('/stakeStart', wrap(stakeStart))
app.post('/stakeGoodAccounting', wrap(stakeGoodAccounting))
app.post('/stakeEnd', wrap(stakeEnd))
app.post('/xfLobbyEnter', wrap(xfLobbyEnter))
app.post('/xfLobbyExit', wrap(xfLobbyExit))
app.post('/deploySmartwallet', wrap(deploySmartwallet))
app.post('/batch/stakeStart', wrap(batchStakeStart))

app.set('trust proxy', true);
app.use(function(err, req, res, next) {
  res.status(500).json({
    error: err.message
  })
});
app.listen(port);
