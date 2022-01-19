const FpStr = require('fpstr');
const {
  forceArray,
  sortBy,
  range,
} = require('./utils/arrays');

const arr2tsv = (rows) => rows.map((row) => row.join('\t')).join('\n');

const MARC_STAT_JSON_COLUMNS = [
  'recordsTotal',
  'occurrencesTotal',
  'valueSize',
  'samples',
  'fingerprints',
  'containingRecords',
  'occurrences',
];
const sortByValue = (obj) => sortBy(
  Object.keys(obj),
  (k) => -obj[k],
);

const jsonToTsv = (jsonObj, topNValues = 3) => {
  const header = [
    'field',
    'code',
    'ind1',
    'ind2',
    'subfield',

    'containingRecords',
    'containingRecords_pt',

    'occurrences',
    'occurrences_pt',

    ...(range(1, 2 + 1, 1)).map((rank) => `sample_${rank}`),

    'topSize',
    'meanSize',
    'fingerprintVariants',
    ...(range(1, topNValues + 1, 1)).map((rank) => `topFingerprint_${rank}`),
  ];
  const usedFields = Object.keys(jsonObj.valueSize).sort();
  const rows = usedFields.map(
    (marcField) => {
      const firstLastSample = [
        jsonObj.samples[marcField][0],
        jsonObj.samples[marcField][1] || '',
      ];

      const inds = (marcField.split(' ')[1] || '  ');
      return ([
        // Field key part
        marcField,
        marcField.split(' ')[0],
        inds[0],
        inds[1],
        marcField.replace(/^[^$]+/ui, ''),

        // Records impact
        jsonObj.containingRecords[marcField],
        `${(
          (100 * jsonObj.containingRecords[marcField]) / jsonObj.recordsTotal
        ).toFixed(2)}%`,

        // Data fields impact
        jsonObj.occurrences[marcField],
        `${(
          (100 * jsonObj.occurrences[marcField]) / jsonObj.occurrencesTotal
        ).toFixed(2)}%`,

        // Samples
        ...firstLastSample,

        // Median
        sortByValue(jsonObj.valueSize[marcField])[0],

        // Mean
        (
          Object.keys(jsonObj.valueSize[marcField]).reduce(
            (a, k) => (
              a + parseInt(k, 10) * jsonObj.valueSize[marcField][k]
            ),
            0,
          ) / jsonObj.occurrences[marcField]
        ).toFixed(2),

        Object.keys(jsonObj.fingerprints[marcField]).length,
        ...sortByValue(jsonObj.fingerprints[marcField]).slice(0, topNValues),
      ]);
    },
  );

  return arr2tsv([header, ...rows]);
};

class StatCounter {
  constructor() {
    this.recordsTotal = 0;
    this.occurrencesTotal = 0;
    this.valueSize = {};
    this.samples = {};
    this.fingerprints = {};
    this.containingRecords = {};
    this.occurrences = {};
  }

  add(entity) {
    this.recordsTotal += 1;

    Object.keys(entity).sort().forEach((tag) => {
      const fieldItems = forceArray(entity[tag]);
      (fieldItems || []).forEach((fieldItem) => {
        let subfieldsToUse = [];
        if (typeof fieldItem !== 'string') {
          subfieldsToUse = Object.keys(fieldItem).filter((k) => (k.length === 1)).sort();
        }

        if (subfieldsToUse.length > 0) {
          // subfields

          subfieldsToUse.forEach((code) => {
            const f = `${tag} ${fieldItem.ind1 || '#'}${fieldItem.ind2 || '#'}$${code}`;
            if (fieldItem[code]) {
              const subfieldItems = forceArray(fieldItem[code]);

              this.containingRecords[f] = (this.containingRecords[f] || 0) + 1;

              this.occurrencesTotal += subfieldItems.length;
              this.occurrences[f] = (this.occurrences[f] || 0) + 1;

              subfieldItems.forEach((subfield) => {
                this.samples[f] = this.samples[f] ? [this.samples[f][0], subfield] : [subfield];

                this.valueSize[f] = this.valueSize[f] || {};
                this.valueSize[f][subfield.length] = (this.valueSize[f][subfield.length] || 0) + 1;

                const fp = FpStr(subfield);
                this.fingerprints[f] = this.fingerprints[f] || {};
                this.fingerprints[f][fp] = (this.fingerprints[f][fp] || 0) + 1;
              });
            }
          });
        } else {
          // control field
          const f = `${tag}`;

          this.containingRecords[f] = (this.containingRecords[f] || 0) + 1;
          this.occurrences[f] = (this.occurrences[f] || 0) + 1;

          const fieldValue = typeof fieldItem === 'object' && fieldItem.value
            ? fieldItem.value
            : fieldItem;

          this.samples[f] = this.samples[f] ? [this.samples[f][0], fieldValue] : [fieldValue];

          this.valueSize[f] = this.valueSize[f] || {};
          this.valueSize[f][fieldValue.length] = (this.valueSize[f][fieldValue.length] || 0) + 1;

          const fp = FpStr(fieldValue);
          this.fingerprints[f] = this.fingerprints[f] || {};
          this.fingerprints[f][fp] = (this.fingerprints[f][fp] || 0) + 1;
        }
      });
    });
  }

  toJSON() {
    return MARC_STAT_JSON_COLUMNS.reduce(
      (a, k) => ({
        ...a,
        [k]: this[k],
      }),
      {},
    );
  }

  toTSV() {
    return jsonToTsv(this.toJSON());
  }
}

module.exports = {
  StatCounter,
  // jsonToTsv,
};
