# Use the fork without waiting for upstream

Use `wmaurer/tree-sitter-typescript` to ship the parser fixes to the consuming project now.
Keep upstream contributions independent of the fork's combined changes.
The user authorized implementation, local integration merges, and pushes to `fork` on November 13, 2026.
Do not publish upstream issues or PRs.

## Confirm scope before execution

- [x] Get explicit approval to execute this plan. Keep upstream publication separate from permission to work locally.
- [x] Record the upstream base SHA, imported PR head SHA, generator version, and test results for each fix.
- [x] Preserve the three issue drafts and this plan as local files. Do not include them in parser-fix commits.
- [ ] Locate the consuming project's patch, affected real files, parser runtime version, and artifact-loading code before promising patch removal.

The parser work can proceed without the consuming project. Artifact installation and patch removal cannot.
Maintaining the fork is ongoing work, not a condition for completing the initial delivery.

## Keep these branches separate

- `origin` points to `tree-sitter/tree-sitter-typescript`.
- `fork` points to `wmaurer/tree-sitter-typescript`.
- Keep `master` aligned with upstream `master`.
- Create `integration` from the current upstream `master`. Merge each tested fix into this branch.
- Create each new fix branch from upstream `master`, not from `integration`.
- Open upstream PRs from those fix branches against upstream `master`.

The fixes do not depend on one another. Only `integration` combines them.

## Establish a reproducible baseline

- [x] Recheck `git status --short` and the remote URLs. Fetch upstream `master` and record its SHA without overwriting local work.
- [x] Use separate worktrees for testing the variance PR and each independent fix. Keep `integration` separate from contribution work.
- [x] Restore dependencies from `package-lock.json` with `npm ci --legacy-peer-deps`, as the lint workflow does.
- [x] Record `npx --no-install tree-sitter --version`. Use the lockfile-resolved CLI, not an automatically downloaded latest release.
- [x] Generate both parsers, run the checks below on the unchanged upstream base, and save their output.
- [x] Confirm that generation leaves the unchanged base's tracked artifacts identical.

Run these commands from the repository root in each test worktree.
Confirm that the corpus output covers both TypeScript and TSX.

```sh
	(cd typescript && ../node_modules/.bin/tree-sitter generate)
	(cd tsx && ../node_modules/.bin/tree-sitter generate)
	XDG_CACHE_HOME="$PWD/.cache" npx --no-install tree-sitter test -r
	npm_config_build_from_source=true npm run install
	npm test
	npm run lint
```

Run generation from each grammar directory. Passing a grammar path from the root writes into the wrong `src` directory with CLI 0.24.4.
Use a separate CLI cache per worktree and force parser compilation with `test -r`.
Run the shared corpus with both default grammar orders in `tree-sitter.json`, then restore the configuration.
The execution harness performs those steps and records each result.
`npm_config_build_from_source=true npm run install` forces a native rebuild without running dependency lifecycle scripts.
Without that flag, `node-gyp-build` can reuse a stale binding.
The existing Node tests only check grammar loading. They do not prove the fixes parse correctly.
If the optional `tree-sitter` runtime is missing, install a compatible test runtime explicitly before running those tests.
Record any dependency adjustment and keep unrelated manifest changes out of fix PRs.

For each fix, first run its regression on the unchanged base and save the failing parse.
Then require the expected tree on the fixed parser, with no `ERROR` or missing nodes for valid inputs.
Rebuild artifacts before binding tests so a stale binary cannot produce a false pass.
Compare lint failures with the baseline. Existing failures need a recorded comparison, not an unexplained waiver.

## Add variance support

- [x] Fetch and inspect upstream [PR #364](https://github.com/tree-sitter/tree-sitter-typescript/pull/364) at its current head before importing it.
- [x] Read its hand-written grammar and corpus changes separately from generated parser files. Test the exact fetched SHA, not a moving PR ref.
- [x] Use #364 rather than [#361](https://github.com/tree-sitter/tree-sitter-typescript/pull/361). #364 uses anonymous modifier tokens, while #361 adds a named `variance` node.
- [x] Test variance annotations in TypeScript and TSX, including `in`, `out`, `in out`, constraints, defaults, and `out` as a type parameter name.
- [x] Check the `name` field for keyword-like parameter names. A parse without errors is insufficient if `out` becomes a modifier instead of the name.
- [x] Cover existing `const` parameters and TypeScript-accepted modifier combinations in their legal contexts. Use the TypeScript compiler to settle language-validity questions.
- [x] Run the existing corpus and Node binding tests. Check lint and distinguish existing failures from new failures.
- [x] Merge the tested #364 head and its required follow-up into `integration`. Do not also import #361.
- [x] Keep existing [issue #370](https://github.com/tree-sitter/tree-sitter-typescript/issues/370) as the variance report. Do not create a duplicate issue or variance PR.

If #364 fails a required case, keep its import out of `integration` until a tested follow-up is ready.
Base that follow-up on the tested PR head and record its dependency.
Do not open a competing variance PR automatically. Report the gap on the existing PR, or agree on a separate contribution first.
Do not assume the existing PR replaces every behavior in the local patch.

## Fix escaped backticks in template literal types

- [x] Recheck upstream issues and PRs for an existing fix before creating a new issue.
- [ ] Use `issue-draft-escaped-template-literal-types.md` for the issue if no matching report exists.
- [x] Create `fix-escaped-template-literal-types` from upstream `master`.
- [x] Reproduce the failure, add focused corpus regressions, and implement the fix.
- [x] Extend the template literal type cases in `test/corpus/types.txt`. Cover escaped backticks, escaped backslashes, escaped interpolation markers, and escapes beside substitutions.
- [x] Regenerate the TypeScript and TSX parser artifacts with the repository-compatible CLI.
- [x] Run the corpus tests, Node binding tests, and lint. Verify the reproduction parses without errors.
- [ ] Verify the consuming project's affected real input with its actual parser artifact.
- [ ] Open a PR against upstream `master` containing only this fix and its tests.
- [x] Merge the tested fix branch into `integration` immediately. Do not wait for the upstream PR to merge.

## Fix newline-separated generic call signatures

- [x] Keep existing [issue #335](https://github.com/tree-sitter/tree-sitter-typescript/issues/335) as the call-signature report. Do not submit a duplicate issue from `issue-draft-generic-call-signatures.md`.
- [x] Create `fix-newline-generic-call-signatures` from upstream `master`.
- [x] Reproduce the failure and investigate a fix. Treat the local scanner heuristic described in the draft as unproven.
- [x] Add regression cases for consecutive call signatures and valid generic types and comparison expressions across line breaks.
- [x] Extend the call-signature cases in `test/corpus/types.txt` and expression cases where needed. Cover explicit separators, comments, and TSX ambiguities.
- [x] Assert that the reproduction contains two call signatures. For valid multiline generics and comparisons, assert the intended tree rather than only the absence of errors.
- [x] Prefer a grammar-level fix if it resolves the ambiguity. If a scanner change is needed, explain the token-state condition and test its effects in both grammars.
- [x] Regenerate the TypeScript and TSX parser artifacts with the repository-compatible CLI.
- [x] Run the corpus tests, Node binding tests, and lint. Verify the regression cases.
- [ ] Verify the consuming project's affected real inputs with its actual parser artifact.
- [ ] Open a separate PR against upstream `master` referencing #335.
- [x] Merge the tested fix branch into `integration` immediately. Do not wait for the upstream PR to merge.

## Keep contributions independently reviewable

- [ ] Search issues and PRs again at publication time. Reuse an existing escaped-backtick report or fix if one has appeared.
- [ ] Include the minimal reproduction, failing-base evidence, passing-head evidence, and exact test commands in each new PR.
- [x] Include required generated changes under `typescript/src/` and `tsx/src/`. Exclude unrelated generator churn and local build artifacts.
- [x] Obtain an independent review of grammar or scanner changes before integrating them. Passing tests do not replace review.
- [x] Push the verified fix branches to `fork`.
- [ ] Push each contribution branch to `fork` and open its upstream PR against `tree-sitter/tree-sitter-typescript:master` only when publication is authorized.

Expect two new upstream PRs, not three. Create at most one new issue for escaped backticks.
Reuse #335 for call signatures and #370 with #364 for variance.
If an existing escaped-backtick fix appears, reassess that contribution rather than duplicating it.

## Use the combined parser

- [x] After each merge, test the combined `integration` branch. Independent fixes can still conflict in shared grammar rules or generated artifacts.
- [x] If generated files conflict, merge the hand-written changes first and regenerate both parsers with the recorded toolchain. Do not choose one side's parser wholesale.
- [x] Push `integration` to the fork after verification.
- [ ] Build and distribute the parser artifacts the consuming project actually uses. A Git dependency alone does not replace an existing WebAssembly or native artifact.
- [ ] Pin the consuming project to a tested commit or immutable artifact from `integration`, not a moving branch.
- [ ] Verify all three reproductions and the consuming project's affected real files with the actual parser artifacts.
- [ ] Remove each part of the local hack patch only after the fork demonstrably replaces it. Keep any unrelated patch behavior.
- [ ] Record the artifact checksum, source SHA, and generation command. Keep the previous pin and artifacts available for rollback.
- [ ] Verify a clean consuming-project install loads the pinned artifact without reapplying the replaced patch.

No additional PR into the fork is required to combine the changes. Merge the tested branches into `integration`.

The fork milestone is complete when all fixes are tested together and the verified integration SHA is pushed.
The consumer milestone is complete only when a clean install passes the real-file regressions with the replacement artifact.
Until the consumer milestone passes, keep the local patch.

## Maintain the fork

- [ ] Periodically merge upstream `master` into `integration` and rerun verification.
- [ ] When upstream lands an equivalent fix, check whether Git already recognizes its history.
- [ ] If upstream squash-merges or rewrites a fix, resolve duplicate changes during synchronization. Do not blindly revert the original fix or rewrite a consumed integration history.
- [ ] Update the consuming project's pin only after verifying the new combined artifact.
- [ ] Return to upstream artifacts once they contain every required fix and pass the consuming project's tests.

## Execution order

Start with variance support from #364, then escaped backticks, then generic call signatures.
This is a delivery order, not a dependency chain.
Sequence Work into Verifiable Units keeps each fix independently testable and reviewable.
Laziness Protocol favors reusing the existing variance contribution instead of duplicating it.

## Pre-execution review

On November 13, 2026, the local branch was `master` at `75b3874edb2dc714fb1fd77a32013d0f8699989f`.
The remotes matched this plan. Only this plan and the three issue drafts were untracked.
#364 was open and non-draft at `465aa162d077093dc5ad4f46a9463bde6274425e`.
#361 was open and draft. Issues #335 and #370 were open.
Recheck these facts before execution.

No parser was generated or tested during this documentation review.
Dependencies were not installed, and no local Tree-sitter CLI was available.
The original commands were an untested recipe. Execution corrected the recipe above.
Neither variance implementation, the scanner heuristic, nor the consuming project's patch has been validated here.
The escaped-backtick duplicate search remains an execution prerequisite.

## Execution record

The locked generator is Tree-sitter CLI 0.24.4.
The unchanged base regenerates without tracked changes.
The isolated test runtime is `tree-sitter` 0.21.1. TypeScript 5.7.3 checks syntax and modifier validity.
No dependency manifests or lockfiles changed.

- `fix-variance-annotations` contains the exact #364 head plus a dependent repair at `5bad20e`.
  The original PR breaks `out` as a parameter name and some legal `const` modifier positions.
  The repair passes 114 corpus entries with each default grammar and four native tests.
- `fix-escaped-template-literal-types` is based on upstream `master` and contains `a655a4c`.
  The fix passes 113 corpus entries with each default grammar and two native tests.
- `fix-newline-generic-call-signatures` is based on upstream `master` and contains `9e5cdc3`.
  The fix passes 116 corpus entries with each default grammar and two native tests.
  An additional 96 return-type and comment-separator combinations pass in each grammar.

Each fix has a failing regression commit before its implementation commit.
Lint has the same two JSDoc errors and four warnings on the base and each fix.
Independent correctness review approved all three heads before integration.
The combined parser passes 119 corpus entries with each default grammar, four native tests, ten direct reproduction checks, and 192 signature combinations.
Regeneration leaves no tracked changes.

The verified `integration` commit is `f4192b7bf073a3fdc95af021c844e88f02916202`.
All three fix branches and `integration` are pushed to `wmaurer/tree-sitter-typescript`.
Git remote-ref reads and the GitHub branch API confirm the published integration SHA.
The initial atomic push failed because the fork inherited a branch named `fix`.
The contribution branches therefore use `fix-` rather than `fix/`. The existing `fix` branch is unchanged.
No upstream issues or PRs were published. The fork milestone is complete.

The generic-signature investigation found an existing ASI limitation when the only newline occurs inside a block comment.
Both generic and non-generic signatures fail that case before and after the fix.
The limitation is tracked locally, outside these fixes. No upstream issue was published.

Execution evidence is in the session's `files` directory under `/home/wayne/.copilot/session-state/50d4bc30-28bd-4afd-a8c9-93c7ebad2886`.
`verify-worktree.cjs` reruns generation, both corpus defaults, a forced native rebuild, binding tests, and the lint comparison.
`decisions.tsv` records decisions and evidence.
The consuming project's patch, artifact-loading code, and affected real files remain unverified.

## Next: drive fixes with the tsc oracle harness

Added November 14, 2026.
The harness is on branch `oracle-harness` (worktree `.worktrees/oracle`, commits `8d23205`, `987e33c`), in `oracle/`. It is pushed to `fork`.
It compares the grammar against the typescript@6.0.3 parser over `tests/cases` from microsoft/TypeScript v6.0.3, which is 14,896 units and runs in about 3 seconds.
Usage: `node oracle/run.ts fetch`, `node oracle/run.ts run --grammar <worktree> --out <file>`, `node oracle/run.ts diff <before> <after>`. `diff` exits 1 on any regression.

Baseline: master has 237 grammar-rejects, and `integration` at `f4192b7` has 220. Integration fixes 17 units with 0 regressions.

- [x] Merge `oracle-harness` into `integration`. Done November 14, 2026, as 7a936c8 (pushed). The baseline for the next `diff` is `.worktrees/integration/oracle/out/integration.jsonl`, refreshed after each merge (148 rejects at `8df12f0`).
Merge recipe: `parser.c` always conflicts, so take either side, regenerate with `verify-worktree.cjs`, then run the harness before committing. Run the harness from `.worktrees/integration/oracle` with `ORACLE_CACHE=../../oracle/oracle/.cache` to reuse the fetched corpus.

Since `e298fd5`, `diff` also counts units that become `grammar-accepts` as regressions, and lists units that leave `agree-error` for `agree-clean` (checker-only errors the grammar now accepts) without failing. Rechecked against master, the integration baseline at `90c124a` had one such regression, `jsxParsingErrorImmediateSpreadInAttributeValue.tsx`. It is a pre-existing over-accept, not a fix bug. Master already accepts `<X a={...a} />` (tsc TS1109), from the JSX grammar inherited from tree-sitter-javascript. The newline generic call signature fix only inserts the same automatic semicolon tsc inserts, so the parser now reaches that JSX. Track it with the other `grammar-accepts` cases.

Upstream references: the user wants each upstream issue and PR this fork fixes to show one commit reference, and nothing else upstream. No comments, no @-mentions, no notifications. Write `tree-sitter/tree-sitter-typescript#N` once per item, in the merge commit that imports the fix. Never rebase or force-push `integration`, because every new commit ID adds a duplicate event. Done so far: #358 (`90c124a`), #381 (`33654f3`), and #335, #348, #360, #361, #364, #369 and #370 (`4a9013f`, the README fork-status commit). Add new fixes to that README table.

- [ ] Import existing upstream PRs into fix branches, one at a time, and merge each into `integration` only when `diff` shows 0 regressions:
  - [x] `export type *` (15 units): took #358 over #360 (same language, one `choice` instead of two duplicated rules, more tests). Branch `fix-export-type-star` is the unchanged #358 head `8a43a91`; CLI 0.24.4 regenerates it with no changes, and its test commit fails before the fix. Merged as `90c124a` (pushed): integration 220 to 205 rejects, 15 fixes, 0 regressions.
  - [x] `accessor` (30 units): #381, one commit by its author, kept unchanged as branch `fix-accessor-modifier` (`affaccc`). Its two corpus tests fail on master and pass with the fix, and CLI 0.24.4 regenerates it with no changes. Merged as `33654f3` (pushed): integration 205 to 175 rejects, 30 fixes, 0 regressions. One checker-only unit now parses (`@dec abstract accessor`, TS1206, decorator placement). Spot checks against tsc: `accessor` as a variable, function, parameter, object key, interface member, enum member, namespace and import name all agree. `accessor⏎ x = 1` now parses as two members, which matches tsc and fixes a master bug. `accessor *gen() {}` is rejected, which is correct (TS1275).
  - [x] Import attributes on re-exports (12 units): no upstream issue or PR in tree-sitter-typescript or tree-sitter-javascript (upstream #304 covered `assert` on imports only and is closed). New fix on branch `fix-reexport-import-attributes` (`742dd9c` test, `c5be2b2` fix, pushed). It moves the optional `import_attribute` into `_from_clause`, so every `from` clause takes one, including `export type *` after the merge. `import x = require()` no longer takes one, which matches tsc. The test fails on master. On its own the branch fixes 12 units against master with 0 regressions. Merged as `a98dbd5`, README row `34cdfb1` (pushed): integration 175 to 163 rejects, 12 fixes, 0 regressions, 0 checker-only.
- [x] `export import x = require()` (15 units): no upstream issue or PR. New fix on branch `fix-export-import-require` (`6e3557c` test, `7ba9dce` fix, pushed). It adds an export_statement form that wraps the require form of import_statement, with an optional `type` and no `typeof` or import attributes, which matches tsc. On its own the branch fixes 15 units against master with 0 regressions. Merged as `00697cd`, README row `8df12f0` (pushed): integration 163 to 148 rejects, 15 fixes, 0 regressions. 2 checker-only units now parse (TS1147, `export import x = require()` in a namespace), which the grammar already accepted without `export`.
- [ ] Contextual keywords as names, using tree-sitter 0.25 `reserved`, starting from #357 (the javascript 0.25 bump). Clusters: `export { type }` (34), `await` parameter (12), `accessor`, `abstract`. Measure the reject count before and after.
- [ ] Work the remaining clusters from `summary.md`, largest first. Examples are `static` index signatures (11) and the automatic semicolon clusters (7 each).
- [ ] Newline before `with` in an import (`import a from "x"⏎with {..}`, importAttributes11): the external scanner inserts an automatic semicolon before `with`. tsc accepts the newline on imports but rejects it on exports (TS1005), so the scanner check must not apply to `export`. Own branch. Low priority: 1 unit, and the change touches the automatic semicolon logic every statement goes through.
- [ ] Later: add a DefinitelyTyped corpus and syntax that is new in TypeScript 7.x.
