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
  const withActive = false;
  const erasHistoric = await api.derive.staking.erasHistoric(withActive);
  const eraIndexes = erasHistoric.slice(
    Math.max(erasHistoric.length - historySize, 0)
  )
  console.log(`Requested eras:`, eraIndexes.map(era => era.toString()).join(', '));
  console.log(`Gathering data ...`);

  const [
    erasPoints,
    erasPreferences,
    erasSlashes,
    erasExposures,
  ] = await Promise.all([
    api.derive.staking._erasPoints(eraIndexes),
    api.derive.staking._erasPrefs(eraIndexes),
    api.derive.staking._erasSlashes(eraIndexes),
    api.derive.staking._erasExposure(eraIndexes),
  ]);

  for(const eraIndex of eraIndexes) {
    const eraStakingInfo = await getEraStakingInfo(
      api,
      erasPoints.find(({ era }) => era.eq(eraIndex)),
      erasPreferences.find(({ era }) => era.eq(eraIndex)),
      erasSlashes.find(({ era }) => era.eq(eraIndex)),
      erasExposures.find(({ era }) => era.eq(eraIndex)),
    );
    // console.log(`eraStakingInfo:`, JSON.stringify(eraStakingInfo, null, 2));
    await writeValidatorEraCSV(
      network,
      eraIndex,
      eraStakingInfo
    );
  }
}

main().catch(console.error).finally(() => process.exit());

async function getEraStakingInfo(api, eraPoints, eraPreferences, eraSlashes, eraExposures) {
  const eraValidatorAddresses = Object.keys(eraPoints['validators']);
  // console.log(`eraValidatorAddresses:`, JSON.stringify(eraValidatorAddresses));
  return Promise.all(eraValidatorAddresses.map(async validatorAddress => {
    // We need to get controller address from current staking info, this may be inaccurate
    const staking = await api.derive.staking.account(validatorAddress);
    const { identity } = await api.derive.accounts.info(validatorAddress);
    const validatorEraPoints = eraPoints['validators'][validatorAddress] ? eraPoints['validators'][validatorAddress] : 0;
    const validatorExposure = eraExposures['validators'][validatorAddress] ? eraExposures['validators'][validatorAddress] : 0;
    const { commission } = eraPreferences['validators'][validatorAddress] ? eraPreferences['validators'][validatorAddress] : 0;
    const validatorSlashes = eraSlashes['validators'][validatorAddress] ? eraSlashes['validators'][validatorAddress] : [];
    return {
      accountId: validatorAddress,
      controllerId: staking.controllerId,
      displayName: getDisplayName(identity),
      eraPoints: validatorEraPoints,
      exposure: validatorExposure,
      commission,
      slashes: validatorSlashes,
    }
  }))
}

async function writeValidatorEraCSV(network, eraIndex, eraStakingInfo) {
  console.log(`Writing validators CSV file for era ${eraIndex} ...`)
  const filePath = `${exportDir}/${network}_validators_era_${eraIndex}.csv`;
  let file = fs.createWriteStream(filePath);
  file.on('error', function(err) { console.log(err) });
  file.write(`era,name,stash_address,controller_address,commission_percent,self_stake,total_stake,num_stakers,era_points\n`);
  for (const staking of eraStakingInfo) {
    file.write(`${eraIndex},${staking.displayName},${staking.accountId},${staking.controllerId},${(parseInt(staking.commission.toString()) / 10000000).toFixed(2)},${staking.exposure.own},${staking.exposure.total},${staking.exposure.others.length},${staking.eraPoints}\n`);
  }
  return new Promise(resolve => {
    file.on("close", resolve);
    file.close();
    console.log(`Finished!`);
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