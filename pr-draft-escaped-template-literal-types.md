# fix: accept escapes in template literal types

Local draft. Nothing has been posted to GitHub.

- Base branch is `tree-sitter/tree-sitter-typescript:master`.
- Head branch is `wmaurer:fix-escaped-template-literal-types`.
- Add the issue reference after the escaped-template issue exists.

---

## Why

Valid template literal types should parse without errors.
An escaped backtick currently produces an `ERROR` node in both TypeScript and TSX.

```ts
type T = `hello \`world\``;
```

## Changes

Allow the existing `escape_sequence` token inside `template_literal_type`.
Add corpus tests for escaped backticks, backslashes, interpolation markers, and escapes next to substitutions.
Regenerate both parsers with Tree-sitter CLI 0.24.4.

This branch contains only the escape fix and its tests.
It does not depend on the variance or generic-call-signature changes.

## Tests

The new test fails on upstream `75b3874` and passes with this change.
All 113 corpus cases pass with either TypeScript or TSX as the default grammar.
Both Node binding-load tests pass after a forced source rebuild with `tree-sitter` 0.21.1.

The parser commands are:

```sh
	(cd typescript && ../node_modules/.bin/tree-sitter generate)
	(cd tsx && ../node_modules/.bin/tree-sitter generate)
	XDG_CACHE_HOME="$PWD/.cache" node_modules/.bin/tree-sitter test -r
```

The corpus run was repeated with TSX first in `tree-sitter.json`.
The configuration was restored after the test.
`npm run lint` still reports the same two JSDoc errors and four warnings as the unchanged base.
