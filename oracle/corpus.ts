import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';

export const TS_REPO = 'https://github.com/microsoft/TypeScript.git';
export const TS_TAG = 'v6.0.3';
export const TS_SHA = '050880ce59e30b356b686bd3144efe24f875ebc8';
const CORPUS_DIRS = ['tests/cases/conformance', 'tests/cases/compiler'];

export type Dialect = 'ts' | 'tsx';
export type Unit = { id: string; dialect: Dialect; text: string };

export function cacheDir(): string {
  return process.env.ORACLE_CACHE ?? join(import.meta.dirname, '.cache');
}

export function corpusRoot(): string {
  return join(cacheDir(), 'TypeScript');
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

function headSha(dir: string): string | undefined {
  if (!existsSync(join(dir, '.git'))) return undefined;
  try {
    return git(dir, 'rev-parse', 'HEAD');
  } catch {
    return undefined;
  }
}

// Clones into a temp dir and renames into place, so an interrupted fetch never
// leaves a half-populated corpus that a later run would trust.
export function fetchCorpus(): void {
  const root = corpusRoot();
  if (headSha(root) === TS_SHA) {
    console.log(`corpus already at ${TS_TAG} (${TS_SHA}): ${root}`);
    return;
  }
  const tmp = `${root}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  execFileSync('git', ['init', '-q', tmp], { stdio: 'inherit' });
  git(tmp, 'remote', 'add', 'origin', TS_REPO);
  git(tmp, 'sparse-checkout', 'set', ...CORPUS_DIRS);
  execFileSync('git', ['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', TS_SHA], { cwd: tmp, stdio: 'inherit' });
  execFileSync('git', ['checkout', '-q', '--detach', 'FETCH_HEAD'], { cwd: tmp, stdio: 'inherit' });
  if (headSha(tmp) !== TS_SHA) throw new Error(`fetched HEAD is not ${TS_SHA}`);
  rmSync(root, { recursive: true, force: true });
  renameSync(tmp, root);
  console.log(`corpus fetched at ${TS_TAG} (${TS_SHA}): ${root}`);
}

function dialectOf(fileName: string): Dialect | undefined {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.tsx')) return 'tsx';
  if (lower.endsWith('.ts') || lower.endsWith('.mts') || lower.endsWith('.cts')) return 'ts';
  return undefined;
}

// Mirrors splitContentByNewlines in TypeScript's src/harness/harnessUtils.ts.
function splitLines(content: string): string[] {
  for (const sep of ['\r\n', '\n', '\r']) {
    const lines = content.split(sep);
    if (lines.length > 1) return lines;
  }
  return [content];
}

const OPTION = /^\/{2}\s*@(\w+)\s*:\s*([^\r\n]*)/;

// Mirrors makeUnitsFromTest in TypeScript's src/harness/harnessIO.ts: every
// `// @option:` line is dropped, and `// @filename:` starts a new virtual file.
function splitTest(baseName: string, code: string): { name: string; content: string }[] {
  const files: { name: string; content: string }[] = [];
  let name: string | undefined;
  let content: string | undefined;
  for (const line of splitLines(code)) {
    const option = OPTION.exec(line);
    if (option) {
      if (option[1].toLowerCase() !== 'filename') continue;
      if (name) files.push({ name, content: content ?? '' });
      name = option[2].trim();
      content = undefined;
      continue;
    }
    if (content === undefined) content = '';
    else if (content !== '') content += '\n';
    content += line;
  }
  files.push({ name: files.length > 0 || name ? name! : baseName, content: content ?? '' });
  return files;
}

// Mirrors ts.sys.readFile: honors UTF-16 and UTF-8 byte order marks.
function readSource(path: string): string {
  const buf = readFileSync(path);
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(buf.subarray(2, buf.length - (buf.length % 2))).swap16().toString('utf16le');
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le', 2);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.toString('utf8', 3);
  return buf.toString('utf8');
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

export function* loadUnits(filter?: string): Generator<Unit> {
  const root = corpusRoot();
  if (headSha(root) !== TS_SHA) throw new Error(`corpus missing or not at ${TS_SHA}; run \`node oracle/run.ts fetch\``);
  for (const dir of CORPUS_DIRS) {
    for (const path of walk(join(root, dir))) {
      const rel = relative(join(root, 'tests/cases'), path);
      if (dialectOf(path) === undefined) continue;
      if (filter !== undefined && !rel.includes(filter)) continue;
      const files = splitTest(rel.split('/').pop()!, readSource(path));
      const seen = new Map<string, number>();
      for (const file of files) {
        const dialect = dialectOf(file.name);
        if (dialect === undefined) continue;
        let id = files.length === 1 ? rel : `${rel}#${file.name}`;
        const n = (seen.get(id) ?? 0) + 1;
        seen.set(id, n);
        if (n > 1) id += `~${n}`;
        yield { id, dialect, text: file.content };
      }
    }
  }
}
