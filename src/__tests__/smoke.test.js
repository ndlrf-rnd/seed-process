const fs = require('fs');
const path = require('path');

const { MARC_MEDIA_TYPE } = require('@seed/format-marc/src/constants');
const { run } = require('../index');
const { parseArgs } = require('../cli');

test('Smoke test', async () => {
  expect.assertions(1);
  const statsResult = JSON.parse(fs.readFileSync(
    path.join('src', '__tests__', 'marc-schema-test-stats.json'),
    'utf-8',
  ));
  const cmd = [
    '-i', path.join(__dirname, 'marc-schema-test.mrc'), '-I', MARC_MEDIA_TYPE, 'describe',
  ];
  const result = await run(parseArgs(cmd));
  expect(result).toEqual(statsResult);
}, 100 * 1000);
