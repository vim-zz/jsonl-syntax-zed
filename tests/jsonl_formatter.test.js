"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { formatJsonl, parseJsonValues } = require("../server/jsonl-lsp.js");

test("formats compact JSONL records", () => {
  assert.equal(
    formatJsonl('{"name":"John","age":30}\n{"name":"Jane","age":25}\n'),
    '{\n  "name": "John",\n  "age": 30\n}\n{\n  "name": "Jane",\n  "age": 25\n}\n',
  );
});

test("parses already pretty-printed records", () => {
  const input = '{\n  "a": 1,\n  "b": [\n    true,\n    null\n  ]\n}\n{\n  "c": "d"\n}\n';
  assert.deepEqual(parseJsonValues(input), [
    '{\n  "a": 1,\n  "b": [\n    true,\n    null\n  ]\n}',
    '{\n  "c": "d"\n}',
  ]);
});

test("handles strings containing braces and escaped quotes", () => {
  assert.deepEqual(parseJsonValues('{"text":"{not a boundary} \\"ok\\""}\n'), [
    '{"text":"{not a boundary} \\"ok\\""}',
  ]);
});

test("formats arrays and primitive JSON values", () => {
  assert.equal(
    formatJsonl('[{"a":1}]\ntrue\nnull\n42\n"hi"\n'),
    '[\n  {\n    "a": 1\n  }\n]\ntrue\nnull\n42\n"hi"\n',
  );
});

test("keeps CRLF line endings", () => {
  assert.equal(
    formatJsonl('{"a":1}\r\n{"b":2}\r\n'),
    '{\r\n  "a": 1\r\n}\r\n{\r\n  "b": 2\r\n}\r\n',
  );
});

test("throws on invalid JSON", () => {
  assert.throws(() => formatJsonl('{"a":}\n'), /offset 0/);
});

test("preserves numeric lexemes", () => {
  assert.equal(
    formatJsonl('{"scientific":1.23e-4,"large":1234567890123456789}\n'),
    '{\n  "scientific": 1.23e-4,\n  "large": 1234567890123456789\n}\n',
  );
});
