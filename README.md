# tree-sitter-typescript

[![CI][ci]](https://github.com/tree-sitter/tree-sitter-typescript/actions/workflows/ci.yml)
[![discord][discord]](https://discord.gg/w7nTvsVJhm)
[![matrix][matrix]](https://matrix.to/#/#tree-sitter-chat:matrix.org)
[![crates][crates]](https://crates.io/crates/tree-sitter-typescript)
[![npm][npm]](https://www.npmjs.com/package/tree-sitter-typescript)
[![pypi][pypi]](https://pypi.org/project/tree-sitter-typescript)

TypeScript and TSX grammars for [tree-sitter][].

Because TSX and TypeScript are actually two different dialects, this module defines two grammars. Require them as follows:

```js
require("tree-sitter-typescript").typescript; // TypeScript grammar
require("tree-sitter-typescript").tsx; // TSX grammar
```

For Javascript files with [flow] type annotations you can use the `tsx` parser.

## Fork status

This branch of [wmaurer/tree-sitter-typescript](https://github.com/wmaurer/tree-sitter-typescript/tree/integration) collects fixes that are pending in [tree-sitter/tree-sitter-typescript](https://github.com/tree-sitter/tree-sitter-typescript). The aim is to merge them back upstream. Each fix is on its own branch based on upstream `master`. Upstream PRs are imported unchanged, with their authors' commits.

| Fix | Upstream | Branch |
| --- | --- | --- |
| Variance annotations on type parameters (`in`, `out`, `in out`) | [#364](https://github.com/tree-sitter/tree-sitter-typescript/pull/364), plus a repair for `out` as a parameter name and `const` modifier order. Same feature as [#361](https://github.com/tree-sitter/tree-sitter-typescript/pull/361). Issue [#370](https://github.com/tree-sitter/tree-sitter-typescript/issues/370). | `fix-variance-annotations` |
| Escaped backticks in template literal types | New fix, no upstream issue. | `fix-escaped-template-literal-types` |
| Generic call signatures separated only by a line break | New fix. Issue [#335](https://github.com/tree-sitter/tree-sitter-typescript/issues/335). | `fix-newline-generic-call-signatures` |
| `export type *` and `export type * as Ns` | [#358](https://github.com/tree-sitter/tree-sitter-typescript/pull/358). Same feature as [#360](https://github.com/tree-sitter/tree-sitter-typescript/pull/360). Issue [#348](https://github.com/tree-sitter/tree-sitter-typescript/issues/348). | `fix-export-type-star` |
| `accessor` with `static`, `override` and `abstract`, and `accessor` as a member name | [#381](https://github.com/tree-sitter/tree-sitter-typescript/pull/381). Issue [#369](https://github.com/tree-sitter/tree-sitter-typescript/issues/369). | `fix-accessor-modifier` |
| Import attributes (`with` and `assert`) on `export ... from` | New fix, no upstream issue. | `fix-reexport-import-attributes` |

Each fix is checked with the harness in [`oracle/`](oracle/README.md), which compares the grammar with TypeScript 6.0.3's parser over TypeScript's own test suite (14,896 files). On that suite, upstream `master` rejects 237 files that TypeScript accepts, and this branch rejects 163. No fix made the grammar reject a file it accepted before.

[tree-sitter]: https://github.com/tree-sitter/tree-sitter
[flow]: https://flow.org/en/

References

- [TypeScript Language Spec](https://github.com/microsoft/TypeScript/blob/30cb20434a6b117e007a4959b2a7c16489f86069/doc/spec-ARCHIVED.md)

[ci]: https://img.shields.io/github/actions/workflow/status/tree-sitter/tree-sitter-typescript/ci.yml?logo=github&label=CI
[discord]: https://img.shields.io/discord/1063097320771698699?logo=discord&label=discord
[matrix]: https://img.shields.io/matrix/tree-sitter-chat%3Amatrix.org?logo=matrix&label=matrix
[npm]: https://img.shields.io/npm/v/tree-sitter-typescript?logo=npm
[crates]: https://img.shields.io/crates/v/tree-sitter-typescript?logo=rust
[pypi]: https://img.shields.io/pypi/v/tree-sitter-typescript?logo=pypi&logoColor=ffd242
