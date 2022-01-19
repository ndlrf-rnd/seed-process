const fs = require('fs');
const path = require('path');

const { run } = require('../index');
const { parseArgs } = require('../cli');

test('Smoke test', async () => {
  expect.assertions(1);
  const statsResult = JSON.parse(fs.readFileSync(
    path.join('src', '__tests__', 'marc-schema-test-stats.json'),
    'utf-8',
  ));
  const cmd = [
    '-i', path.join('src', '__tests__', 'marc-schema-test.mrc'), '-I', 'marc', 'stats',
  ];
  const result = await run(parseArgs(cmd));
  expect(result).toEqual(statsResult);
}, 10 * 1000);
