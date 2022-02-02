const fs = require('fs');
const os = require('os');
const path = require('path');

const NPM_PACKAGE_MANIFEST_PATH = path.join(__dirname, '..', 'package.json');
const NPM_PACKAGE_MANIFEST = JSON.parse(fs.readFileSync(NPM_PACKAGE_MANIFEST_PATH, 'utf-8'));
const VERSION = NPM_PACKAGE_MANIFEST.version;
const NAME = NPM_PACKAGE_MANIFEST.name;

const DEFAULT_ENCODING = null;

const MIN_DEFAULT_JOBS = 2;

const DEFAULT_JOBS = Math.max(
  MIN_DEFAULT_JOBS,
  parseInt(process.env.CATALOG_JOBS, 10) || os.cpus().length - 1,
);

/**
 * Fetch
 */
const FETCH_PARAMS = {
  highWaterMark: 512 * 1024, // default is 16384
  throttle: 10 * 1000,
  size: 256 * 1024 * 1024, // 1/4 GB
};

const FETCH_PROGRESS_PARAMS = {
  throttle: 10 * 1000,
};

const DEFAULT_DOWNLOAD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36',
  'Transfer-Encoding': 'chunked', // ! Important
};

const DEFAULT_MEDIA_TYPE = 'application/text';
const MAX_URL_LENGTH = 8192;

const REGISTERED_FORMATS = [
  'marc',
];

const TSV_MEDIA_TYPE = 'text/tab-separated-values';
const TSV_ENCODING = 'utf-8';
const TSV_LINE_SEPARATOR = '\n';
const TSV_CELL_SEPARATOR = '\t';
const TSV_EXTENSION = 'tsv';
const TSV_SCHEMA_DOC = 'https://digital-preservation.github.io/csv-schema/csv-schema-1.2.html';
const DEFAULT_BATCH_SIZE = 4 * 1024 * 1024;
const FLUSH_THRESHOLD = 100;
const FIELD_STAT_HEADER = ['field', 'occurrences', 'unique'];
const TSV_HEADER = [
  'dialect', 'format',
  'code', 'subfield',
  'ind1', 'ind2',
  'value', 'record',
];

module.exports = {
  FLUSH_THRESHOLD,
  FIELD_STAT_HEADER,
  TSV_HEADER,
  DEFAULT_BATCH_SIZE,
  DEFAULT_DOWNLOAD_HEADERS,
  DEFAULT_ENCODING,
  DEFAULT_JOBS,
  MIN_DEFAULT_JOBS,
  DEFAULT_MEDIA_TYPE,
  FETCH_PARAMS,
  FETCH_PROGRESS_PARAMS,
  NAME,
  VERSION,
  MAX_URL_LENGTH,
  REGISTERED_FORMATS,
  NPM_PACKAGE_MANIFEST,
  TSV_MEDIA_TYPE,
  TSV_EXTENSION,
  TSV_SCHEMA_DOC,
  TSV_CELL_SEPARATOR,
  TSV_LINE_SEPARATOR,
  TSV_ENCODING,
};
