const os = require('os');
const path = require('path');
const fs = require('fs');

const NPM_PACKAGE_MANIFEST_PATH = path.join(__dirname, '..', 'package.json');
const NPM_PACKAGE_MANIFEST = JSON.parse(fs.readFileSync(NPM_PACKAGE_MANIFEST_PATH, 'utf-8'));
const VERSION = NPM_PACKAGE_MANIFEST.version;
const NAME = NPM_PACKAGE_MANIFEST.name;

const DEFAULT_ENCODING = null;
const DEFAULT_JOBS = Math.max(
  2,
  parseInt(process.env.CATALOG_JOBS, 10) || os.cpus().length,
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

const MAX_POOL_PER_WORKER_SIZE_BYTES = 1024 * 1024;

const DEFAULT_MEDIA_TYPE = 'text/text';
const MAX_URL_LENGTH = 8192;

const REGISTERED_FORMATS = [
  'marc',
];

module.exports = {
  DEFAULT_DOWNLOAD_HEADERS,
  DEFAULT_ENCODING,
  DEFAULT_JOBS,
  DEFAULT_MEDIA_TYPE,
  FETCH_PARAMS,
  FETCH_PROGRESS_PARAMS,
  MAX_POOL_PER_WORKER_SIZE_BYTES,
  NAME,
  VERSION,
  MAX_URL_LENGTH,
  REGISTERED_FORMATS,
  NPM_PACKAGE_MANIFEST,
};
