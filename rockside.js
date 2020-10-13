const {
  TypedDataUtils
} = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');
const request = require('request-promise');

const network = process.env.NETWORK
const apikey = process.env.APIKEY
const rocksideURL = process.env.APIURL || 'https://api.rockside.io'

async function fetchForwardParams(forwarder, account) {
  const requestBody = {
    account,
    channel_id: '0'
  };

  const response = await request({
    uri: `${rocksideURL}/ethereum/${network}/forwarders/${forwarder}/relayParams?apikey=${apikey}`,
    method: 'POST',
    body: requestBody,
    json: true,
  })

  return response;
}

async function forward(forwarder, signer, to, data, nonce, signature, speed, gasPrice) {
  const requestBody = {
    message: {
      signer,
      to,
      data,
      nonce
    },
    signature,
    speed: speed,
    gas_price_limit: gasPrice,
  };

  const response = await request({
    method: 'POST',
    uri: `${rocksideURL}/ethereum/${network}/forwarders/${forwarder}?apikey=${apikey}`,
    method: 'POST',
    body: requestBody,
    json: true,
  })

  return response.tracking_id;
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

async function getTransaction(trackingId) {
  return await request({
    uri: `${rocksideURL}/ethereum/${network}/transactions/${trackingId}?apikey=${apikey}`,
    method: 'GET',
    json: true,
  })
}

module.exports = {
  fetchForwardParams,
  forward,
  relay,
  getTransaction
};
