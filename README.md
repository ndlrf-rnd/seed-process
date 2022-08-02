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
# Convert command

This command allows to convert between bib metadata formats using crosswalks currently presented as `@seed/format-*` packages which should be just installed in same package scope as the `@seed/process` cli launcher.

Example below use package `@seed/format-marc` that might be installed from public repo `https://github.com:ndlrf-rnd/seed-format-marc` and expose largest variety of currently supported (and few plotted) features of bib metadata processing/analysis using SEED fractures ecosystem.

```shell
$ node --max-old-space-size=8192 src/index.js -i ./RuMoRGB-2022-01-30/20220130_035404_rsl01_cl.mrc -I marc -j 2 -l 100000 convert -O 'text/tab-separated-values' -o ./RuMoRGB-2022-01-30/20220130_035404_rsl01_cl.mrc
```

That will generate output folder like `./RuMoRGB-2022-01-30/2022-01-30_rsl07_cl/` with listing like bunch of field + modifier flags + subfield files:

```shell
$ tree RuMoRGB-2022-01-30/2022-01-30_rsl07_cl
├── MARC21_BIBLIOGRAPHIC_001______.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_003______.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_005______.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_007______.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_008______.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_015_2_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_015_a_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_017_b_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_020_a_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_020_c_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_020_z_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_022_8_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_022_a_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_022_y_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_022_z_#_#.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_024_2_7_0.tsv                                                                                                                                 ├── MARC21_BIBLIOGRAPHIC_024_a_2_#.tsv

...

├── MARC21_BIBLIOGRAPHIC_880_b_2_1.tsv
├── MARC21_BIBLIOGRAPHIC_880_c_#_#.tsv
├── MARC21_BIBLIOGRAPHIC_880_c_0_0.tsv
├── MARC21_BIBLIOGRAPHIC_880_e_#_#.tsv
├── MARC21_BIBLIOGRAPHIC_880_f_#_#.tsv
├── MARC21_BIBLIOGRAPHIC_880_g_2_1.tsv
├── MARC21_BIBLIOGRAPHIC_880_t_#_#.tsv
├── MARC21_BIBLIOGRAPHIC_979_a_#_#.tsv
└── MARC21_BIBLIOGRAPHIC_leader______.tsv
```

All this files will have non-empty content targeted fast fields indexing or export to analytical DBMS in `TSV` (UTF-8) format.

Example of the content for `./RuMoRGB-2022-01-30/2022-01-30_rsl07_cl/MARC21_BIBLIOGRAPHIC_024_c_2_#.tsv`:

| **value** | **occurrences** | **ids** |
| ----- | ----------- | --- |
| 100 экз. | 17 | 000387371 000387384 000396771 000406832 000412736 000419210 000425062 000426235 000426238 000442096 000444360 000447109 000447766 000457699 000459353 000477874 000477902 |
| 50 экз. | 10 | 000383149 000386226 000386234 000391163 000393793 000393901 000393988 000424300 000426217 000426227 |
| 46 экз. | 6 | 000385207 000385217 000386398 000387356 000419284 000419286 |
| 41 экз. | 2 | 000419260 000419262 |
| 150 экз. | 1 | 000412733 |
| 2000 экз. | 1 | 000445246 |
| 30 экз. | 1 | 000412737 |
| 300 экз. | 1 | 000457684 |
| 4200 экз. | 1 | 000374922 |
| 500 экз. | 1 | 000423101 |
| 56 экз. | 1 | 000385618 |
| 64 экз. | 1 | 000397167 |
| 70 экз. | 1 | 000357298 |


# Making content overview report

```shell
$ node --max-old-space-size=8192 src/index.js -i ./20220130_035404_rsl01_cl.mrc -I marc describe -o /tmp/20220130_035404_rsl01_cl.tsv 
```

`/tmp/20220130_035404_rsl01/` folder will be created together with defined `/tmp/20220130_035404_rsl01_cl.tsv` output file.
`.tsv` extension is not mandatory, bot output will be formatted as TSV not depending on output file extension.

`-I` flag may accept full media type string like `application` as well as shortened version `marc` without `application` prefix
