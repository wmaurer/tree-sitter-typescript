import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type Parser from 'tree-sitter';
import ts from 'typescript';
import type { Dialect, Unit } from './corpus.ts';

const require = createRequire(import.meta.url);
const TreeSitter: typeof Parser = require('tree-sitter');

export type Point = { row: number; column: number };

export type TsError = {
  kind: 'ERROR' | 'MISSING';
  start: Point;
  end: Point;
  parentType: string;
  text: string;
  signature: string;
};

export type Verdict =
  | { kind: 'agree-clean' }
  | { kind: 'grammar-rejects'; errors: TsError[]; minimized?: string }
  | { kind: 'grammar-accepts'; diagnostics: string[] }
  | { kind: 'agree-error'; diagnostics: string[]; errors: TsError[] };

export type VerdictKind = Verdict['kind'];
export const VERDICT_KINDS: VerdictKind[] = ['agree-clean', 'grammar-rejects', 'grammar-accepts', 'agree-error'];

const MAX_LISTED = 20;

const FIRST_TOKEN = /^[A-Za-z_$][\w$]*|^\d[\w.]*|^[^\sA-Za-z0-9_$]+/;

const scanner = ts.createScanner(ts.ScriptTarget.Latest, true);

function isKeyword(word: string): boolean {
  scanner.setText(word);
  return scanner.scan() !== ts.SyntaxKind.Identifier;
}

// Plain identifiers and numbers collapse to placeholders so one grammar bug
// clusters together whatever the test named its variables; keywords, including
// contextual ones like `accessor` or `out`, stay verbatim.
function firstToken(text: string): string {
  const token = FIRST_TOKEN.exec(text.trimStart())?.[0] ?? '';
  if (/^\d/.test(token)) return '<number>';
  if (/^[A-Za-z_$]/.test(token) && !isKeyword(token)) return '<ident>';
  return token;
}

function toError(node: Parser.SyntaxNode, kind: TsError['kind']): TsError {
  const parentType = node.parent?.type ?? '(root)';
  const text = node.text.replace(/\s+/g, ' ').slice(0, 80);
  // A MISSING node has no text; the node type it stands for is the useful key.
  const token = kind === 'MISSING' ? node.type : firstToken(text);
  return { kind, start: node.startPosition, end: node.endPosition, parentType, text, signature: `${kind}:${parentType}:${token}` };
}

// Visits only subtrees that report hasError, and stops at each ERROR node:
// errors nested inside an ERROR are cascade noise. `firstIndex` is the first
// error's UTF-16 offset, the same unit tsc positions use.
function collectErrors(tree: Parser.Tree): { errors: TsError[]; firstIndex: number } {
  const errors: TsError[] = [];
  let firstIndex = -1;
  if (!tree.rootNode.hasError) return { errors, firstIndex };
  const cursor = tree.walk();
  const record = (kind: TsError['kind']) => {
    if (errors.length === 0) firstIndex = cursor.startIndex;
    errors.push(toError(cursor.currentNode, kind));
  };
  let entering = true;
  for (;;) {
    if (entering) {
      if (cursor.nodeType === 'ERROR') record('ERROR');
      else if (cursor.nodeIsMissing) record('MISSING');
      else if (cursor.currentNode.hasError && cursor.gotoFirstChild()) continue;
    }
    if (cursor.gotoNextSibling()) {
      entering = true;
    } else if (cursor.gotoParent()) {
      entering = false;
    } else {
      return { errors, firstIndex };
    }
  }
}

function fileNameOf(unit: Unit): string {
  return unit.id.slice(unit.id.lastIndexOf('#') + 1).replace(/~\d+$/, '');
}

function formatDiagnostic(d: ts.Diagnostic): string {
  const where = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : { line: 0, character: 0 };
  return `${where.line + 1}:${where.character + 1} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
}

function createSourceFile(fileName: string, dialect: Dialect, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false, dialect === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function tscParse(fileName: string, dialect: Dialect, text: string): { sf: ts.SourceFile; diagnostics: string[] } {
  const sf = createSourceFile(fileName, dialect, text);
  // parseDiagnostics is @internal but stable: the syntactic errors only, no checker.
  const parsed = (sf as ts.SourceFile & { parseDiagnostics: ts.DiagnosticWithLocation[] }).parseDiagnostics;
  return { sf, diagnostics: parsed.map(formatDiagnostic) };
}

function childList(node: ts.Node): ts.NodeArray<ts.Node> | undefined {
  if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node)) return node.members;
  if (ts.isModuleDeclaration(node) && node.body && ts.isModuleBlock(node.body)) return node.body.statements;
  if (ts.isFunctionLike(node) && 'body' in node && node.body && ts.isBlock(node.body)) return node.body.statements;
  return undefined;
}

// `start`/`end` is the span in the original text of the innermost node kept whole.
type Reduction = { text: string; start: number; end: number };

// Candidate reductions of `node` around `pos`, narrowest first. Each keeps the
// enclosing declaration's header and braces, with only the child holding `pos`.
function reductions(sf: ts.SourceFile, node: ts.Node, pos: number): Reduction[] {
  const whole = { text: sf.text.slice(node.getStart(sf), node.end), start: node.getStart(sf), end: node.end };
  const list = childList(node);
  const child = list?.find((c) => c.getStart(sf) <= pos && pos < c.end);
  if (!list || !child) return [whole];
  const head = sf.text.slice(node.getStart(sf), list.pos).trimEnd();
  const tail = sf.text.slice(list.end, node.end).trimStart();
  return [...reductions(sf, child, pos).map((inner) => ({ ...inner, text: `${head}\n  ${inner.text}\n${tail}` })), whole];
}

export type Judge = (unit: Unit) => Verdict;

export function makeJudge(grammarRoot: string): Judge {
  const { typescript, tsx } = require(resolve(grammarRoot));
  const parserFor = (language: Parser.Language): Parser => {
    const parser = new TreeSitter();
    parser.setLanguage(language);
    return parser;
  };
  const parsers: Record<Dialect, Parser> = { ts: parserFor(typescript), tsx: parserFor(tsx) };

  const reproduces = (fileName: string, dialect: Dialect, text: string): boolean =>
    tscParse(fileName, dialect, text).diagnostics.length === 0 && parsers[dialect].parse(text).rootNode.hasError;

  const minimize = (fileName: string, dialect: Dialect, sf: ts.SourceFile, pos: number): Reduction | undefined => {
    const statement = sf.statements.find((s) => s.getStart(sf) <= pos && pos < s.end);
    if (!statement) return undefined;
    return reductions(sf, statement, pos).find((r) => reproduces(fileName, dialect, r.text));
  };

  return (unit) => {
    const fileName = fileNameOf(unit);
    const { sf, diagnostics } = tscParse(fileName, unit.dialect, unit.text);
    const tree = parsers[unit.dialect].parse(unit.text);
    const { errors, firstIndex } = collectErrors(tree);
    if (diagnostics.length === 0 && errors.length === 0) return { kind: 'agree-clean' };
    if (diagnostics.length > 0 && errors.length === 0) return { kind: 'grammar-accepts', diagnostics: diagnostics.slice(0, MAX_LISTED) };
    if (diagnostics.length > 0) return { kind: 'agree-error', diagnostics: diagnostics.slice(0, MAX_LISTED), errors: errors.slice(0, MAX_LISTED) };
    const reduction = minimize(fileName, unit.dialect, sf, firstIndex);
    return { kind: 'grammar-rejects', errors: errors.slice(0, MAX_LISTED), ...(reduction === undefined ? {} : { minimized: reduction.text }) };
  };
}
