const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(process.argv[2]);
const label = process.argv[3];
assert(root && label);
const artifacts = __dirname;
const logs = path.join(artifacts, 'logs');
fs.mkdirSync(logs, { recursive: true });
const cli = path.join(root, 'node_modules/.bin/tree-sitter');
const env = {
  ...process.env,
  XDG_CACHE_HOME: path.join(root, '.cache'),
  NODE_PATH: path.join(artifacts, 'runtime/node_modules'),
  npm_config_build_from_source: 'true',
  NO_COLOR: '1',
};

function run(name, command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8' });
  if (result.error) throw result.error;
  const output = result.stdout + result.stderr;
  fs.writeFileSync(path.join(logs, `${label}-${name}.log`), output);
  console.log(`${name}: exit ${result.status}`);
  assert.equal(result.status, 0, output);
  return output;
}

run('generator', cli, ['--version']);
for (const language of ['typescript', 'tsx']) {
  run(`generate-${language}`, cli, ['generate'], path.join(root, language));
}

const configPath = path.join(root, 'tree-sitter.json');
const original = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(original);
try {
  for (const language of ['typescript', 'tsx']) {
    const reordered = {
      ...config,
      grammars: [
        ...config.grammars.filter(grammar => grammar.name === language),
        ...config.grammars.filter(grammar => grammar.name !== language),
      ],
    };
    fs.writeFileSync(configPath, JSON.stringify(reordered, null, 2) + '\n');
    const output = run(`corpus-${language}`, cli, ['test', '-r']);
    console.log(`${language}: ${output.split('\n').filter(line => line.includes('✓')).length} corpus passes`);
  }
} finally {
  fs.writeFileSync(configPath, original);
}

run('build', 'npm', ['run', 'install']);
run('bindings', 'npm', ['test']);
const lint = spawnSync('npm', ['run', 'lint'], { cwd: root, env, encoding: 'utf8' });
if (lint.error) throw lint.error;
const lintOutput = lint.stdout + lint.stderr;
fs.writeFileSync(path.join(logs, `${label}-lint.log`), lintOutput);
assert.equal(lint.status, 1, lintOutput);
assert.match(lintOutput, /6 problems \(2 errors, 4 warnings\)/);
assert.equal((lintOutput.match(/jsdoc\/tag-lines/g) || []).length, 2);
assert.equal((lintOutput.match(/jsdoc\/check-tag-names/g) || []).length, 4);
console.log('lint: baseline-only failure, 2 errors and 4 warnings');
run('whitespace', 'git', ['diff', '--check']);
