const {
  TypedDataUtils
} = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');

const rpc = process.env.RPC
let Web3 = require('web3')
let web3 = new Web3(rpc)

function hashGnosisMessage(gnosis, tx) {
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

async function getGnosisNonce(gnosis) {
  return await web3.eth.call({
    to: gnosis,
    data: "0xaffed0e0"
  })
}

module.exports = {
  hashGnosisMessage,
  getGnosisNonce,
};
