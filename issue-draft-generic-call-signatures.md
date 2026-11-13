# Comment draft for issue #335

Local draft for [issue #335](https://github.com/tree-sitter/tree-sitter-typescript/issues/335).
Do not open a new issue for this bug. Nothing has been posted to GitHub.

---

I can reproduce this on upstream commit `75b3874` with Tree-sitter CLI 0.24.4.
It affects both TypeScript and TSX.

Here is a small example.

```ts
type A = {
  <T>(o: number): E
  <T>(o: number): E
}
```

The parser reads the first `E` and the next line's `<T>` as one `generic_type`.
It then reports a parse error and produces only one call signature.
Adding a semicolon after the first `E` avoids the error.

I have a fix on `wmaurer/tree-sitter-typescript`, branch `fix-newline-generic-call-signatures`.
It allows an automatic semicolon before `<` when the parser is in a type context.
The scanner already uses the same check for `(` and `[`.

The tests check that the example produces two call signatures.
They also cover comments, explicit separators, multiline type arguments, generic calls, and comparisons.
The corpus suite passes with both grammars.

One separate problem remains.
If the only line break is inside a block comment, the parser still fails.
That also affects non-generic signatures and was present before this fix.
