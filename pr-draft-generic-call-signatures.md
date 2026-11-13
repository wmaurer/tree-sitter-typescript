# fix: separate generic call signatures across line breaks

Local draft. Nothing has been posted to GitHub.

- Base branch is `tree-sitter/tree-sitter-typescript:master`.
- Head branch is `wmaurer:fix-newline-generic-call-signatures`.
- The existing issue is #335.

---

## Why

Valid generic call signatures should parse when a line break separates them.
The parser currently joins the first return type with the next signature's type parameters.
This produces an error in both TypeScript and TSX.

```ts
type A = {
  <T>(o: number): E
  <T>(o: number): E
}
```

Fixes #335.

## Changes

The scanner currently blocks automatic semicolons before every `<`.
Apply the existing type-versus-expression check to `<`, as it already does for `(` and `[`.
This allows a new call signature without splitting generic calls or comparisons in expressions.

TypeScript 5.7.3 does not allow a line break between a type reference's name and its `<`.
It does allow line breaks inside the type arguments and before `<` in a generic function call.
The tests cover those differences.

This branch changes only the scanner and corpus tests.
It does not add tokens, change scanner state, or depend on the other fixes.

## Tests

The three new signature cases fail on upstream `75b3874`.
They pass with this change and produce the expected trees.
All 116 corpus cases pass with either TypeScript or TSX as the default grammar.
Both Node binding-load tests pass after a forced source rebuild with `tree-sitter` 0.21.1.

The corpus command is:

```sh
	XDG_CACHE_HOME="$PWD/.cache" node_modules/.bin/tree-sitter test -r
```

The corpus run was repeated with TSX first in `tree-sitter.json`.
The configuration was restored after the test.
Tests cover comments, explicit separators, multiline type arguments, generic calls, and comparisons.
`npm run lint` still reports the same two JSDoc errors and four warnings as the unchanged base.

## Known limitation

A line break only inside a block comment still fails to separate signatures.
This also fails for non-generic signatures on the unchanged base.
General handling of line breaks inside comments is outside this fix.
