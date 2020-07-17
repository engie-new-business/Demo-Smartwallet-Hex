# Demo Rockside SmartWallet x Hex

## Install

```
npm install
```

## Rockside setup

First you need to deploy a forwarder for your dApp. See our official documentation https://docs.rockside.io/rockside-api

The for each user, you must deploy a smartwallet for their eoa. This part is not documented yet but you can do it as follows.

```
curl --location --request POST 'https://api.rockside.io/ethereum/mainnet/smartwallets' \
--header 'apikey: YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data '{
	"account": "USER_ADDRESS",
	"forwarder": "YOUR_FORWARDER"
}'
```

This SmartWallet is only accesible with the user eoa (directly or with metatransaction) and will hold the funds for the user.

For some call you (ex: `xfLobbyEnter`) the SmartWallet will need some eth, so the user must fund it.

## Hex calls

```
curl --request POST 'http://localhost:8000/stakeStart' \
--header 'Content-Type: application/json' \
--data '{
curl --request POST 'http://localhost:8000/batch/stakeStart' \
--header 'Content-Type: application/json' \
--data '{
  "smartwallet": SMARTWALLET_ADDRESS,
  "signer": "EOA_PRIVATEKEY",
  "batch": [
    {
      "newStakedHearts": ...,
      "newStakedDays": ...
    },
    {
      "newStakedHearts": ...,
      "newStakedDays": ...
    }
  ]
}'

curl --request POST 'http://localhost:8000/stakeGoodAccounting' \
--header 'Content-Type: application/json' \
--data '{
	"smartwallet": SMARTWALLET_ADDRESS,
	"signer": EOA_PRIVATEKEY,
	"stakerAddr": ...,
	"stakeIndex": ...,
	"stakeIdParam": ...
}'


curl --request POST 'http://localhost:8000/stakeEnd' \
--header 'Content-Type: application/json' \
--data '{
	"smartwallet": SMARTWALLET_ADDRESS,
	"signer": EOA_PRIVATEKEY,
	"stakeIndex": ...,
	"stakeIdParam": ...
}'


curl --request POST 'http://localhost:8000/xfLobbyEnter' \
--header 'Content-Type: application/json' \
--data '{
	"smartwallet": SMARTWALLET_ADDRESS,
	"signer": EOA_PRIVATEKEY,
	"referrerAddr": ...,
	"value": ...
}'


curl --request POST 'http://localhost:8000/xfLobbyExit' \
--header 'Content-Type: application/json' \
--data '{
	"smartwallet": SMARTWALLET_ADDRESS,
	"signer": EOA_PRIVATEKEY,
	"enterDay": ...,
	"count": ...
}'
```
