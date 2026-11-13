const assert = require('node:assert');
const { test } = require('node:test');

const Parser = require('tree-sitter');

test('can load TypeScript grammar', () => {
  const parser = new Parser();
  assert.doesNotThrow(() => parser.setLanguage(require('./typescript')));
});

test('can load TSX grammar', () => {
  const parser = new Parser();
  assert.doesNotThrow(() => parser.setLanguage(require('./tsx')));
});

for (const language of ['typescript', 'tsx']) {
  test(`${language} preserves variance parameter names`, () => {
    const parser = new Parser();
    parser.setLanguage(require(`./${language}`));

    for (const [source, name] of [
      ['interface X<out> {}', 'out'],
      ['interface X<out = string> {}', 'out'],
      ['interface X<in out> {}', 'out'],
      ['interface X<out out> {}', 'out'],
      ['interface X<in T extends string = string> {}', 'T'],
      ['interface X<out T extends string = string> {}', 'T'],
      ['interface X<in out T extends string = string> {}', 'T'],
      ['class X<const T> {}', 'T'],
      ['class X<const in out T> {}', 'T'],
      ['class X<in const out T> {}', 'T'],
      ['class X<in out const T> {}', 'T'],
      ['class X<out const T> {}', 'T'],
      ['class X<in const T> {}', 'T'],
      ['function f<const T>() {}', 'T'],
    ]) {
      const tree = parser.parse(source);
      assert.strictEqual(tree.rootNode.hasError, false, source);
      const declaration = tree.rootNode.firstNamedChild;
      const parameter = declaration.childForFieldName('type_parameters').firstNamedChild;
      assert.strictEqual(parameter.childForFieldName('name').text, name, source);
    }
  });
}
