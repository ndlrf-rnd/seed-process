# seed-process
SEED Stream processing library

# Installation

Utility require actual stable Node.js release and you may install it running:

```shell
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
$ nvm install v14.17.3
$ nvm use v14.17.3
```

```shell
git clone https://github.com/ndlrf-rnd/seed-process.git
cd seed-process
npm install .
```

# Making content overview report

```shell
$ node --max-old-space-size=8192 src/index.js -i ./20220130_035404_rsl01_cl.mrc -I marc describe -o /tmp/20220130_035404_rsl01_cl.tsv 
```

`/tmp/20220130_035404_rsl01/` folder will be created together with defined `/tmp/20220130_035404_rsl01_cl.tsv` output file.
`.tsv` extension is not mandatory, bot output will be formatted as TSV not depending on output file extension.

`-I` flag may accept full media type string like `application` as well as shortened version `marc` without `application` prefix
