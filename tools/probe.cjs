const fs = require('node:fs');
const path = require('node:path');
const oracleModules = '/home/wayne/projects/tree-sitter/tree-sitter-typescript/.worktrees/integration/oracle/node_modules';
const Parser = require(`${oracleModules}/tree-sitter`);
const ts = require(`${oracleModules}/typescript`);

function tscClean(dialect, text) {
  const file = ts.createSourceFile(dialect === 'tsx' ? 'x.tsx' : 'x.ts', text, ts.ScriptTarget.Latest, false, dialect === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  return file.parseDiagnostics.length === 0;
}

const [base, head, casesFile] = process.argv.slice(2);
const load = root => require(path.resolve(root, 'bindings/node'));
const grammars = { base: load(base), head: load(head) };

const cases = fs.readFileSync(casesFile, 'utf8').split(/^=== /m).filter(Boolean).map(block => {
  const [header, ...body] = block.split('\n');
  const tags = header.trim().split(/\s+/);
  return { name: tags[0], tsxOnly: tags.includes('tsx'), invalid: tags.includes('invalid'), checker: tags.includes('checker'), text: body.join('\n') };
});

function parse(binding, dialect, text) {
  const parser = new Parser();
  parser.setLanguage(binding[dialect]);
  const root = parser.parse(text).rootNode;
  return { broken: root.hasError, sexp: root.toString() };
}

let failures = 0;
for (const c of cases) {
  for (const dialect of c.tsxOnly ? ['tsx'] : ['typescript', 'tsx']) {
    const b = parse(grammars.base, dialect, c.text);
    const h = parse(grammars.head, dialect, c.text);
    const tsc = tscClean(dialect, c.text);
    let verdict;
    if (c.checker) verdict = h.broken ? 'ok (checker-only error)' : 'note head accepts checker-only error';
    else if (c.invalid !== !tsc) verdict = `FAIL case label disagrees with tsc`;
    else if (c.invalid) verdict = h.broken ? 'ok' : b.broken ? 'FAIL head accepts invalid input' : 'note head and base accept invalid';
    else if (h.broken) verdict = 'FAIL head rejects';
    else if (b.broken) verdict = 'ok (base rejects)';
    else verdict = b.sexp === h.sexp ? 'ok' : 'FAIL tree differs from base';
    if (verdict.startsWith('FAIL')) failures++;
    console.log(`${verdict.padEnd(32)} ${dialect.padEnd(10)} ${c.name}`);
    if (verdict.startsWith('FAIL') && process.env.VERBOSE) console.log(`  base: ${b.sexp}\n  head: ${h.sexp}`);
  }
}
console.log(`${failures} failures`);
process.exitCode = failures ? 1 : 0;
