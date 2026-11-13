# Comment draft for PR #364

Local draft for [PR #364](https://github.com/tree-sitter/tree-sitter-typescript/pull/364).
[Issue #370](https://github.com/tree-sitter/tree-sitter-typescript/issues/370) already covers variance support.
Do not open a new issue or a competing PR. Nothing has been posted to GitHub.

---

I tested this PR at `465aa162d077093dc5ad4f46a9463bde6274425e`.
It adds variance support, but I found a few cases that still fail in both TypeScript and TSX.

`out` can also be the type parameter's name.
These examples produce errors with the current PR head.

```ts
interface A<out> {}
interface B<out = string> {}
interface C<in out> {}
```

In these examples, the `name` field should contain `out`.
The parser must not treat every `out` token as a modifier.

Some valid `const` positions also fail.

```ts
class D<in const T> {}
class E<out const T> {}
class F<in out const T> {}
```

TypeScript 5.7.3 accepts these class declarations.
The context matters when checking whether `const` and variance modifiers can appear together.

I added a fix on top of this PR in `wmaurer/tree-sitter-typescript`, branch `fix-variance-annotations`.
It keeps `out` available as a parameter name and allows `const` between the variance modifiers.
It keeps the existing `type_parameter` node and does not add a named variance node.

The added tests fail on this PR head and pass with the fix.
The corpus suite passes with both grammars.
The Node tests also check the parameter names, not only the absence of parse errors.

The fix allows repeated modifiers and different orders at the syntax level.
It does not try to reject every combination that TypeScript's type checker rejects.
For example, TypeScript still reports an error for `out in T`.
