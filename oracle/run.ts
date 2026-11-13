import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { fetchCorpus, loadUnits, TS_SHA, TS_TAG, type Dialect } from './corpus.ts';
import { makeJudge, VERDICT_KINDS, type Verdict, type VerdictKind } from './judge.ts';

type Result = { id: string; dialect: Dialect; verdict: Verdict };
type Reject = { id: string; dialect: Dialect; verdict: Extract<Verdict, { kind: 'grammar-rejects' }>; snippet: string };

const USAGE = `usage:
  node oracle/run.ts fetch
  node oracle/run.ts run [--grammar <repo root>] [--out <file.jsonl>] [--filter <substring>]
  node oracle/run.ts diff <before.jsonl> <after.jsonl>`;

function fail(message: string, code: number): never {
  console.error(message);
  process.exit(code);
}

function parseFlags(args: string[], allowed: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i].replace(/^--/, '');
    if (!args[i].startsWith('--') || !allowed.includes(name) || args[i + 1] === undefined) fail(USAGE, 2);
    flags[name] = args[i + 1];
  }
  return flags;
}

function grammarVersion(grammar: string): string {
  const sha = execFileSync('git', ['-C', grammar, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['-C', grammar, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  return dirty === '' ? sha : `${sha}-dirty`;
}

// A binding older than parser.c would report results for a grammar that no
// longer exists, so refuse rather than mislead.
function assertBindingFresh(grammar: string): void {
  const release = join(grammar, 'build/Release');
  const bindings = existsSync(release) ? readdirSync(release).filter((f) => f.endsWith('.node')) : [];
  if (bindings.length === 0) fail(`no binding in ${release}; build it with \`npm_config_build_from_source=true npm run install\` in ${grammar}`, 2);
  const oldestBinding = Math.min(...bindings.map((f) => statSync(join(release, f)).mtimeMs));
  for (const parser of ['typescript/src/parser.c', 'tsx/src/parser.c']) {
    if (statSync(join(grammar, parser)).mtimeMs > oldestBinding) {
      fail(`stale binding: ${parser} is newer than ${release}/*.node; rebuild with \`npm_config_build_from_source=true npm run install\` in ${grammar}`, 2);
    }
  }
}

function snippetOf(verdict: Reject['verdict'], text: string): string {
  if (verdict.minimized !== undefined) return verdict.minimized.split('\n').slice(0, 15).join('\n');
  return text.split('\n')[verdict.errors[0].start.row] ?? '';
}

function writeSummary(path: string, header: string[], counts: Record<VerdictKind, number>, rejects: Reject[]): void {
  const clusters = new Map<string, Reject[]>();
  for (const reject of rejects) {
    const signature = reject.verdict.errors[0].signature;
    clusters.set(signature, [...(clusters.get(signature) ?? []), reject]);
  }
  const ranked = [...clusters].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1)).slice(0, 40);
  const out = [
    '# tree-sitter-typescript oracle summary',
    '',
    ...header.map((line) => `- ${line}`),
    '',
    '## Verdicts',
    '',
    '| verdict | units |',
    '| --- | ---: |',
    ...VERDICT_KINDS.map((kind) => `| ${kind} | ${counts[kind]} |`),
    '',
    '## Top grammar-rejects clusters',
    '',
    `Clustered by the signature of each unit's first tree-sitter error. ${clusters.size} distinct signatures.`,
    '',
  ];
  ranked.forEach(([signature, members], i) => {
    // The shortest snippet is the most readable sample; ties break on id for determinism.
    const sample = members.reduce((best, m) => (m.snippet.length < best.snippet.length || (m.snippet.length === best.snippet.length && m.id < best.id) ? m : best));
    const label = sample.verdict.minimized === undefined ? 'error line' : 'minimized';
    out.push(`### ${i + 1}. \`${signature}\` (${members.length})`, '', `sample: \`${sample.id}\` (${label})`, '', '```' + (sample.dialect === 'tsx' ? 'tsx' : 'ts'), sample.snippet, '```', '');
  });
  writeFileSync(path, out.join('\n'));
}

function run(args: string[]): void {
  const flags = parseFlags(args, ['grammar', 'out', 'filter']);
  const grammar = resolve(flags.grammar ?? join(import.meta.dirname, '..'));
  const outPath = resolve(flags.out ?? join(import.meta.dirname, 'out/results.jsonl'));
  assertBindingFresh(grammar);
  const judge = makeJudge(grammar);
  const started = performance.now();
  const counts = Object.fromEntries(VERDICT_KINDS.map((k) => [k, 0])) as Record<VerdictKind, number>;
  const rejects: Reject[] = [];

  mkdirSync(dirname(outPath), { recursive: true });
  const fd = openSync(`${outPath}.tmp`, 'w');
  for (const unit of loadUnits(flags.filter)) {
    const result: Result = { id: unit.id, dialect: unit.dialect, verdict: judge(unit) };
    counts[result.verdict.kind]++;
    if (result.verdict.kind === 'grammar-rejects') rejects.push({ id: unit.id, dialect: unit.dialect, verdict: result.verdict, snippet: snippetOf(result.verdict, unit.text) });
    writeSync(fd, JSON.stringify(result) + '\n');
  }
  closeSync(fd);
  renameSync(`${outPath}.tmp`, outPath);

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  const total = VERDICT_KINDS.reduce((n, k) => n + counts[k], 0);
  const header = [
    `grammar: ${grammar} @ ${grammarVersion(grammar)}`,
    `oracle: typescript ${ts.version} parseDiagnostics`,
    `corpus: microsoft/TypeScript ${TS_TAG} (${TS_SHA}) tests/cases/{conformance,compiler}${flags.filter === undefined ? '' : `, filter \`${flags.filter}\``}`,
    `units: ${total}, run time ${seconds}s`,
  ];
  const summaryPath = join(dirname(outPath), 'summary.md');
  writeSummary(summaryPath, header, counts, rejects);
  console.log(header.join('\n'));
  for (const kind of VERDICT_KINDS) console.log(`${kind.padEnd(16)} ${counts[kind]}`);
  console.log(`wrote ${outPath}\nwrote ${summaryPath}`);
}

function readResults(path: string): Map<string, Result> {
  const results = new Map<string, Result>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const result = JSON.parse(line) as Result;
    results.set(result.id, result);
  }
  return results;
}

function diff(args: string[]): void {
  if (args.length !== 2) fail(USAGE, 2);
  const [before, after] = args.map(readResults);
  const regressions: string[] = [];
  const fixes: string[] = [];
  for (const [id, b] of before) {
    const a = after.get(id);
    if (a === undefined) continue;
    const wasRejected = b.verdict.kind === 'grammar-rejects';
    const isRejected = a.verdict.kind === 'grammar-rejects';
    if (!wasRejected && isRejected) regressions.push(`${id} (${b.verdict.kind} -> grammar-rejects)`);
    if (wasRejected && !isRejected) fixes.push(`${id} (grammar-rejects -> ${a.verdict.kind})`);
  }
  const onlyBefore = [...before.keys()].filter((id) => !after.has(id));
  const onlyAfter = [...after.keys()].filter((id) => !before.has(id));
  const section = (title: string, ids: string[]) => {
    console.log(`${title}: ${ids.length}`);
    for (const id of ids) console.log(`  ${id}`);
  };
  section('regressions', regressions);
  section('fixes', fixes);
  section(`only in ${args[0]}`, onlyBefore);
  section(`only in ${args[1]}`, onlyAfter);
  process.exit(regressions.length > 0 ? 1 : 0);
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'fetch' && rest.length === 0) fetchCorpus();
else if (command === 'run') run(rest);
else if (command === 'diff') diff(rest);
else fail(USAGE, 2);
