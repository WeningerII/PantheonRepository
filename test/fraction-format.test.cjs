const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const formatters = ['data.js', 'pr-boot.js'].map(name => {
  const source = fs.readFileSync(path.join(__dirname, '../app', name), 'utf8');
  const section = source.match(/const COMMON_FRACTIONS = \[[\s\S]*?const formatFraction = \(f\) => \{[\s\S]*?\n\};/);
  assert.ok(section, `fraction formatter missing from ${name}`);
  return vm.runInNewContext(section[0] + '\nformatFraction;');
});

test('exact deep ancestry contributions remain nonzero in synchronous and lazy runtimes', () => {
  for (const format of formatters) {
    assert.equal(format(0), '0');
    assert.equal(format(.5), '½');
    assert.equal(format(9 / 16), '9⁄16');
    assert.equal(format(2 ** -30), '1⁄1073741824');
    assert.equal(format(9 * 2 ** -30), '9⁄1073741824');
    assert.equal(format(2 ** -52), '1⁄4503599627370496');
  }
});

test('fractions beyond exact display precision retain a nonzero scientific representation', () => {
  for (const value of [1e-10, 1e-100, 2 ** -60, Number.MIN_VALUE]) {
    const outputs = formatters.map(format => format(value));
    assert.equal(outputs[0], outputs[1]);
    assert.ok(Number(outputs[0]) > 0, `${value} was lost as ${outputs[0]}`);
  }
  for (const format of formatters) {
    assert.equal(format(null), '—');
    assert.equal(format(undefined), '—');
    assert.equal(format(1 / 7), '0.143');
    assert.equal(format(.7), '0.700');
  }
});
