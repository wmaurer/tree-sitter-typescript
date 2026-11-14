# Oracle harness

Compares this grammar against TypeScript's own parser over TypeScript's test suite. The output is a ranked list of valid TypeScript that the grammar rejects, and a diff that flags regressions between two grammar builds.

The oracle is `typescript@6.0.3`, the last JavaScript implementation of the parser. The corpus is `tests/cases/{conformance,compiler}` from microsoft/TypeScript at tag `v6.0.3`. Test files that contain `// @filename:` directives are split into virtual files the same way TypeScript's test harness splits them. Only `.ts`, `.mts`, `.cts`, `.d.ts`, and `.tsx` files are compared.

## Setup

Node 23.6 or later is required, because the harness is TypeScript that Node runs directly.

```sh
cd oracle && npm ci && cd ..
node oracle/run.ts fetch
```

`fetch` makes a shallow, sparse clone into `oracle/.cache/`. Set `ORACLE_CACHE` to use another directory. Running `fetch` again does nothing if the clone is already at the pinned commit.

Build the grammar's Node binding in the repository root:

```sh
npm ci --legacy-peer-deps
npm_config_build_from_source=true npm run install
```

`run` refuses to start (exit code 2) if `build/Release/*.node` is missing or older than `typescript/src/parser.c` or `tsx/src/parser.c`. Rebuild the binding after each `tree-sitter generate`.

## Run

```sh
node oracle/run.ts run [--grammar <repo root>] [--out <file.jsonl>] [--filter <substring>]
```

The default grammar is the repository that contains `oracle/`. The default output is `oracle/out/results.jsonl`, with `summary.md` in the same directory. Each line holds `{id, dialect, verdict}`. A full run takes a few seconds.

Verdicts:

- `agree-clean`: TypeScript and tree-sitter both accept the unit.
- `grammar-rejects`: TypeScript accepts the unit and tree-sitter has an `ERROR` or `MISSING` node. This is the bug list. Each entry has the tree-sitter errors and, where possible, a minimized reproduction.
- `grammar-accepts`: TypeScript's parser reports an error and tree-sitter does not.
- `agree-error`: both report an error.

TypeScript's parser accepts some invalid syntax and reports it from the type checker instead, for example `export` on a class member or an empty `var`. When tree-sitter rejects a unit that the parser accepts, the harness also runs the checker. If the checker reports a syntax error inside the code that tree-sitter rejects, the verdict is `agree-error`. The list of checker codes that count as syntax errors is in `judge.ts`.

`summary.md` groups `grammar-rejects` by the signature of the first tree-sitter error, `<ERROR|MISSING>:<parent node type>:<first token>`, and lists the 40 largest groups with a sample.

## Compare two grammar builds

Check out each build in its own directory, and build the binding in each one. Then run the harness from this directory against both:

```sh
git worktree add ../before master
(cd ../before && npm ci --legacy-peer-deps && npm_config_build_from_source=true npm run install)
node oracle/run.ts run --grammar ../before --out oracle/out/before/results.jsonl
node oracle/run.ts run --out oracle/out/after/results.jsonl
node oracle/run.ts diff oracle/out/before/results.jsonl oracle/out/after/results.jsonl
```

`diff` lists regressions (units that became `grammar-rejects` or `grammar-accepts`), fixes (units that stopped being either), and units that are in only one file. It exits with 1 if there is a regression, and 0 otherwise.

It also lists units that went from `agree-error` to `agree-clean`. TypeScript's parser accepts these, its checker rejects them with a syntax error, and tree-sitter now accepts them. They do not count as regressions, because the grammar builds a syntax tree and does not enforce checker rules such as decorator placement. Review them to make sure each one is a checker-only rule.
