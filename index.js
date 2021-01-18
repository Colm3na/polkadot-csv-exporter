// Required imports
const { ApiPromise, WsProvider } = require('@polkadot/api');
const config = require('./config.js');
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

const chain = config.chains.find(chain => chain.name === argv.chain);
if (!chain) {
  console.log(`Error: Chain ${argv.chain} doesn't exist`);
  process.exit(-1)
}

const wsEndPoint = chain.wsEndPoint;
const historySize = argv.number || 30;

async function main () {
  // Initialise the provider to connect to the local node
  const provider = new WsProvider(wsEndPoint);

  // Create the API and wait until ready
  const api = await ApiPromise.create({ provider });

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version()
  ]);

  console.log(`Connected to chain ${chain} using ${wsEndPoint} (${nodeName} v${nodeVersion})`);

  console.log(`Fetching era history ...`);
  const withActive = false
  const erasHistoric = await api.derive.staking.erasHistoric(withActive)
  const eraIndexes = erasHistoric.slice(
    Math.max(erasHistoric.length - historySize, 0)
  )
  console.log(JSON.stringify(eraIndexes.map(era => era.toString()), null, 2));

  console.log(`Fetching nominator staking info ...`);
  const nominatorStaking = await getNominatorStaking(api);
  console.log(JSON.stringify(nominatorStaking, null, 2));
  console.log(`Fetching validator staking info ...`);
  const myValidatorStaking = await getMyValidatorStaking(api, nominatorStaking, eraIndexes[0]);
  console.log(JSON.stringify(myValidatorStaking, null, 2));
}

main().catch(console.error).finally(() => process.exit());

async function getNominatorStaking(api) {
  const nominators = await api.query.staking.nominators.entries();
  const nominatorAddresses = nominators.map(([address]) => address.toHuman()[0]);
  // produces ws disconnects / conn resets
  // return api.derive.staking.accounts(nominatorAddresses);
  return await Promise.all(
    nominatorAddresses.map(nominatorAddress => api.derive.staking.account(nominatorAddress))
  );
}

async function getMyValidatorStaking(api, nominatorsStakings, eraIndex) {
  const eraPoints = await api.query.staking.erasRewardPoints(eraIndex);
  const validatorsAddresses = await api.query.session.validators();
  const validatorsStakings = await api.derive.staking.accounts(validatorsAddresses)

  const myValidatorStaking = Promise.all ( validatorsStakings.map( async validatorStaking => {

    const validatorAddress = validatorStaking.accountId
    const infoPromise = api.derive.accounts.info(validatorAddress);

    const validatorEraPoints = eraPoints.toJSON()['individual'][validatorAddress.toHuman()] ? eraPoints.toJSON()['individual'][validatorAddress.toHuman()] : 0

    let voters = 0;
    for (const staking of nominatorsStakings) {
      if (staking.nominators.includes(validatorAddress)) {
        voters++
      }
    }

    const {identity} = await infoPromise
    return {
      ...validatorStaking,
      displayName: getDisplayName(identity),
      voters: voters,
      eraPoints: validatorEraPoints,
    }

  }))

  return myValidatorStaking
}