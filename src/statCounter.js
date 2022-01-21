const {
  forceArray,
  range,
} = require('./utils/arrays');

const { mergeObjectsReducer, sortByValue } = require('./utils/objects');

const arr2tsv = (rows) => rows.map((row) => row.join('\t')).join('\n');

// const MARC_STAT_JSON_COLUMNS = [
//   'recordsTotal',
//   'occurrencesTotal',
//   'valueSize',
//   'samples',
//   'containingRecords',
//   'occurrences',
// ];

const expandMarcObj = (rec, arrayIndex = false) => {
  const kvObj = {};
  // console.error(rec);
  Object.keys(rec).forEach((k) => {
    // if (typeof rec[k] === 'string') {
    //   kvObj[k] = forceArray(rec[k]);
    // } else if (Array.isArray(rec[k])) {
    forceArray(rec[k]).forEach((fieldValue, fieldValueIdx) => {
      if (typeof fieldValue === 'string') {
        kvObj[k] = kvObj[k] || [];
        kvObj[k].push(fieldValue);
      } else {
        Object.keys(fieldValue).filter(
          (subfieldCode) => subfieldCode.length === 1,
        ).sort().forEach(
          (subfieldCode) => {
            forceArray(fieldValue[subfieldCode]).forEach(
              (subfieldValue, subfieldValueIdx) => {
                if (arrayIndex) {
                  const expandedKey = `${k}.${fieldValue.ind1}.${fieldValue.ind2}.${fieldValueIdx}.${subfieldCode}.${subfieldValueIdx}`;
                  kvObj[expandedKey] = subfieldValue;
                } else {
                  const expandedKey = `${k}.${fieldValue.ind1}.${fieldValue.ind2}.${subfieldCode}`;
                  // console.error('kvobj', 'kvobj', kvObj)
                  if (!Array.isArray(kvObj[expandedKey])) {
                    kvObj[expandedKey] = [];
                  }
                  kvObj[expandedKey].push(subfieldValue);
                }
              },
            );
          },
        );
      }
    });
  });
  // });
  // }
  // console.error('kvObj', kvObj);
  return kvObj;
};

const jsonToTsv = (jsonObj) => {
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
    this.containingRecords = {};
    this.occurrences = {};
  }

  mergeJSON(dataObj) {
    mergeObjectsReducer(this, dataObj);
  }

  add(entity) {
    this.recordsTotal += 1;
    const expandedEntity = expandMarcObj(entity, false);
    const keys = Object.keys(expandedEntity).sort();

    keys.forEach((k) => {
      if (!this.containingRecords[k]) {
        this.containingRecords[k] = 0;
      }

      if (!this.occurrences[k]) {
        this.occurrences[k] = 0;
      }
      this.occurrences[k] += 1;

      const values = forceArray(expandedEntity[k]);
      this.containingRecords[k] += 1;
      this.occurrencesTotal += values.length;

      values.forEach((value) => {
        // console.error(k, value);
        // samples
        if (!this.samples[k]) {
          this.samples[k] = [value, null];
        } else {
          this.samples[k] = [this.samples[k][0], value];
        }

        // valueSize
        if (!this.valueSize[k]) {
          this.valueSize[k] = {};
        }
        const la = `${value.length}`;
        if (!this.valueSize[k][la]) {
          this.valueSize[k][la] = 0;
        }
        this.valueSize[k][la] += 1;
      });
    });
  }

  toJSON() {
    return Object.keys(this).reduce(
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
