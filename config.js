module.exports = {
  chains: [
    {
      name: 'kusama',
      wsEndPoint: 'wss://kusama-rpc.polkadot.io',
      denom: 'KSM',
      decimalPlaces: 12,
    },
    {
      name: 'polkadot',
      wsEndPoint: 'wss://rpc.polkadot.io',
      denom: 'DOT',
      decimalPlaces: 10,
    },
  ]    
}