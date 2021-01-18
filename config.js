module.exports = {
  chains: [
    {
      name: 'kusama',
      wsEndPoint: 'wss://kusama.api.onfinality.io/public-ws',
      denom: 'KSM',
      decimalPlaces: 12,
    },
    {
      name: 'polkadot',
      wsEndPoint: 'wss://polkadot.api.onfinality.io/public-ws',
      denom: 'DOT',
      decimalPlaces: 10,
    },
  ]    
}