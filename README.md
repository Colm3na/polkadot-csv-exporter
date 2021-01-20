# Polkadot CSV exporter

Export CSV files with staking info for the selected number of (previous) eras.

Currently supported chains are `kusama` and `polkadot`.

You can (hopefully) add more Substrate based networks that implement staking and identity pallets, just add it to `config.js` file and test it.

Columns:

- Era index
- Name
- Stash address
- Controller address
- Commission percentage
- Self stake
- Total stake
- Number of stakers
- Era points

Exported CSV files (one file per era) will be stored in `csv_export` folder, chain and era index are inserted in each filename.

## Install

NOTE: Node.js and Yarn are required, tested with Node.js v14.

```
git clone https://github.com/Colm3na/polkadot-csv-exporter.git
cd polkadot-csv-exporter
yarn
```

## Usage

```
node index.js --help
node index.js -c kusama -n 30
```