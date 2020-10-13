const {
  TypedDataUtils
} = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');
const chainId = process.env.CHAINID

function hashForwarderMessage(forwarder, signer, to, data, nonce) {
  const domain = {
    verifyingContract: forwarder,
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

module.exports = {
  hashForwarderMessage,
};
