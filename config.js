module.exports = {
  exportDir: './csv_export',
  chains: [
    {
      name: 'kusama',
      wsEndPoint: 'wss://cc3-3.kusama.network',
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