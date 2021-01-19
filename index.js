// Required imports
fs = require('fs');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { exportDir, chains } = require('./config.js');
const yargs = require('yargs');
const argv = yargs
  .scriptName("index.js")
  .option('chain', {
    alias: 'c',
    description: 'Chain: kusama or polkadot',
    type: 'string',
  })
  .option('number', {
      alias: 'n',
      description: 'Number of previous eras to analyze',
      type: 'number',
  })
  .usage("Usage: node index.js -c kusama -n 30")
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'V')
  .demandOption(['chain', 'number'])
  .argv;
const chain = chains.find(chain => chain.name === argv.chain);
if (!chain) {
  console.log(`Error: Chain ${argv.chain} doesn't exist`);
  process.exit(-1)
}
if (argv.number > 84) {
  console.log(`Error: Maximum is 84 eras`);
  process.exit(-1)
}
const network = chain.name;
const { wsEndPoint } = chain;
const historySize = argv.number;

async function main () {
  const provider = new WsProvider(wsEndPoint);
  const api = await ApiPromise.create({ provider });
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version()
  ]);
  console.log(`Connected to chain ${chain} using ${wsEndPoint} (${nodeName} v${nodeVersion})`);
  console.log(`Fetching era history ...`);
  const withActive = false;
  const erasHistoric = await api.derive.staking.erasHistoric(withActive);
  const eraIndexes = erasHistoric.slice(
    Math.max(erasHistoric.length - historySize, 0)
  )
  console.log(`Requested eras:`, eraIndexes.map(era => era.toString()).join(', '));
  console.log(`Gathering data ...`);
  const sessionIndex = 0;
  const blockNumber = 0;
  for(const eraIndex of eraIndexes) {
    const myValidatorStaking = await getEraValidatorStaking(api, eraIndex);
    // await writeValidatorEraCSV(network, eraIndex, sessionIndex, blockNumber, myValidatorStaking);
  }
}

main().catch(console.error).finally(() => process.exit());

async function getEraValidatorStaking(api, eraIndex) {
  // const eraPoints = await api.derive.staking.erasPoints(eraIndex);
  const eraExposure = await api.derive.staking.erasExposure(eraIndex);
  console.log('eraExposure:', JSON.stringify(eraExposure.validators, null, 2));

  // const eraPrefs = await api.derive.staking.erasPrefs(eraIndex);
  // const eraRewards = await api.derive.staking.erasRewards(eraIndex);
  // const eraSlashes = await api.derive.staking.erasSlashes(eraIndex);

  // const eraValidatorAddresses = eraPoints.toJSON()['individual'];


  // const getEraValidatorStaking = Promise.all(eraValidatorAddresses.map( async validatorAddress => {
  //   const { identity } = await api.derive.accounts.info(validatorAddress);
  //   const validatorEraPoints = eraPoints.toJSON()['individual'][validatorAddress.toHuman()] ? eraPoints.toJSON()['individual'][validatorAddress.toHuman()] : 0
    
  //   const validatorExposure = eraPoints.toJSON()['individual'][validatorAddress.toHuman()] ? eraPoints.toJSON()['individual'][validatorAddress.toHuman()] : 0

  //   return {
  //     ...validatorStaking,
  //     displayName: getDisplayName(identity),
  //     eraPoints: validatorEraPoints,
  //   }
  // }))
  // return myValidatorStaking
}

async function writeValidatorEraCSV(network, eraIndex, sessionIndex, blockNumber, myValidatorStaking) {
  console.log(`Writing validators CSV for era ${eraIndex} ...`)
  const filePath = `${exportDir}/${network}_validators_era_${eraIndex}.csv`;
  let file = fs.createWriteStream(filePath);
  file.on('error', function(err) { console.log(err) });
  file.write(`era,session,block_number,name,stash_address,controller_address,commission_percent,self_stake,total_stake,num_stakers,voters,era_points\n`);
  for (const staking of myValidatorStaking) {
    file.write(`${eraIndex},${sessionIndex},${blockNumber},${staking.displayName},${staking.accountId},${staking.controllerId},${(parseInt(staking.validatorPrefs.commission.toString()) / 10000000).toFixed(2)},${staking.exposure.own},${staking.exposure.total},${staking.exposure.others.length},${staking.voters},${staking.eraPoints}\n`);
  }
  return new Promise(resolve => {
    file.on("close", resolve);
    file.close();
    console.log(`Finished writing validators CSV for era ${eraIndex}`);
  });
}

function getDisplayName(identity){
  if (
    identity.displayParent &&
    identity.displayParent !== `` &&
    identity.display &&
    identity.display !== ``
  ) {
    return `${identity.displayParent.replace(/\n/g, '')} / ${identity.display.replace(/\n/g, '')}`;
  } else {
    return identity.display || ``;
  }
}