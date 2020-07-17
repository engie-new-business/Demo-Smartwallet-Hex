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

const network = process.env.NETWORK || 'mainnet'
const chainId = process.env.CHAINID || 1
const apikey = process.env.APIKEY
const rocksideURL = process.env.APIURL || 'https://api.rockside.io'

const forwarderAddress = process.env.FORWARDER;
const contractAddress = process.env.CONTRACT; // hex smart contract address
const port = process.env.PORT || '8000'

async function setup(req, res) {
  res.json({
    hexContract: contractAddress,
  })
}

async function fetchRelayParams(account) {
  const requestBody = {
    account,
    channel_id: '0'
  };

  const response = await request({
    uri: `${rocksideURL}/ethereum/${network}/forwarders/${forwarderAddress}/relayParams?apikey=${apikey}`,
    method: 'POST',
    body: requestBody,
    json: true,
  })

  return response;
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
  } = await fetchRelayParams(signer);

  const message = makeMessage(0, dataForContract)
  const hash = hashRelayMessage(signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await forward(signer, smartwallet, message, nonce, signature, gasPrice)
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
  } = await fetchRelayParams(signer);

  const message = makeBatchMessage(calls)
  const hash = hashRelayMessage(signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await forward(signer, smartwallet, message, nonce, signature, gasPrice)
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
  } = await fetchRelayParams(signer);

  const message = makeMessage(0, dataForContract)
  const hash = hashRelayMessage(signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await forward(signer, smartwallet, message, nonce, signature, gasPrice)
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
  } = await fetchRelayParams(signer);

  const message = makeMessage(0, dataForContract)
  const hash = hashRelayMessage(signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await forward(signer, smartwallet, message, nonce, signature, gasPrice)
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
  } = await fetchRelayParams(signer);

  const message = makeMessage(value, dataForContract)
  const hash = hashRelayMessage(signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await forward(signer, smartwallet, message, nonce, signature, gasPrice)
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
  } = await fetchRelayParams(signer);

  const message = makeMessage(0, dataForContract)
  const hash = hashRelayMessage(signer, smartwallet, message, nonce);
  const signature = await sign(signerPrivateKey, hash)
  const trackingId = await forward(signer, smartwallet, message, nonce, signature, gasPrice)
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

function hashRelayMessage(signer, to, data, nonce) {
  const domain = {
    verifyingContract: forwarderAddress,
    chainId
  };

  const eip712DomainType = [{
      name: 'verifyingContract',
      type: 'address'
    },
    {
      name: 'chainId',
      type: 'uint256'
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
    'TxMessage': [{
      name: "signer",
      type: "address"
    }, {
      name: "to",
      type: "address"
    }, {
      name: "data",
      type: "bytes"
    }, {
      name: "nonce",
      type: "uint256"
    }, ]
  };

  const encodedMessage = TypedDataUtils.encodeData(
    'TxMessage', {
      signer,
      to,
      data,
      nonce
    },
    messageTypes,
  );

  const hashedMessage = ethUtil.keccak256(encodedMessage);

  return ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      hashedDomain,
      hashedMessage,
    ])
  );
}

async function sign(signerPrivateKey, hash) {
  const sig = await ethUtil.ecsign(hash, Buffer.from(signerPrivateKey.substring(2), 'hex'));
  const signature = ethUtil.toRpcSig(sig.v, sig.r, sig.s);
  return signature
}

async function forward(signer, to, data, nonce, signature, gasPrice) {
  const requestBody = {
    message: {
      signer,
      to,
      data,
      nonce
    },
    signature,
    speed: 'fast',
    gas_price_limit: gasPrice.fast,
  };

  const response = await request({
    method: 'POST',
    uri: `${rocksideURL}/ethereum/${network}/forwarders/${forwarderAddress}?apikey=${apikey}`,
    method: 'POST',
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
app.post('/stakeStart', wrap(stakeStart))
app.post('/stakeGoodAccounting', wrap(stakeGoodAccounting))
app.post('/stakeEnd', wrap(stakeEnd))
app.post('/xfLobbyEnter', wrap(xfLobbyEnter))
app.post('/xfLobbyExit', wrap(xfLobbyExit))

app.post('/batch/stakeStart', wrap(batchStakeStart))

app.set('trust proxy', true);
app.use(function(err, req, res, next) {
  res.status(500).json({
    error: err.message
  })
});
app.listen(port);
