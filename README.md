# Polkadot CSV exporter

Export CSV files with stakig info for the selected number of (previous) eras.

Currently supported chains are `kusama` and `polkadot`.

NOTE: Requires Node.js, tested with v14.


## Install & Usage

```
git clone https://github.com/Colm3na/polkadot-csv-exporter.git
cd polkadot-csv-exporter
yarn
node index.js --help
node index.js -c kusama -n 30
```
