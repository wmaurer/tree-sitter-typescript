# bug: escaped backticks cause errors in template literal types

Local draft for a new issue. Nothing has been posted to GitHub.

---

## Describe the bug

An escaped backtick in a template literal type causes a parse error.
The same type without escaped backticks parses correctly.
This affects both the TypeScript and TSX grammars.

## Repro

```ts
type T = `hello \`world\``;
```

## Steps to reproduce

Use upstream commit `75b3874edb2dc714fb1fd77a32013d0f8699989f`.
Save the example as `repro.ts` in the repository root.
Install the locked dependencies and run the TypeScript parser.

```sh
	npm ci --legacy-peer-deps
	(cd typescript && ../node_modules/.bin/tree-sitter generate)
	(cd typescript && XDG_CACHE_HOME="$PWD/../.cache" ../node_modules/.bin/tree-sitter parse --rebuild ../repro.ts)
```

The tree contains this error. Source positions are omitted.

```text
(template_literal_type
  (string_fragment)
  (ERROR (escape_sequence) (identifier) (escape_sequence)))
```

## Tree-sitter CLI version

`tree-sitter 0.24.4`

## Expected behavior

The type should parse without errors.
Each escaped backtick should be an `escape_sequence` inside the `template_literal_type`.

## Investigation

The `template_literal_type` rule allows text and substitutions, but not `escape_sequence`.
Adding the existing escape token to that rule fixes the example.
Tests also cover escaped backslashes, escaped interpolation markers, and escapes next to substitutions.
