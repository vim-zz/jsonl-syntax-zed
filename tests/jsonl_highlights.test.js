"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// Capture names that Zed themes recognize, per
// https://zed.dev/docs/extensions/languages#syntax-highlighting
const ZED_STANDARD_CAPTURES = new Set([
  "attribute",
  "boolean",
  "comment",
  "comment.doc",
  "constant",
  "constant.builtin",
  "constructor",
  "embedded",
  "emphasis",
  "emphasis.strong",
  "enum",
  "function",
  "hint",
  "keyword",
  "label",
  "link_text",
  "link_uri",
  "namespace",
  "number",
  "operator",
  "predictive",
  "preproc",
  "primary",
  "property",
  "punctuation",
  "punctuation.bracket",
  "punctuation.delimiter",
  "punctuation.list_marker",
  "punctuation.markup",
  "punctuation.special",
  "selector",
  "selector.pseudo",
  "string",
  "string.escape",
  "string.regex",
  "string.special",
  "string.special.symbol",
  "tag",
  "tag.doctype",
  "text.literal",
  "title",
  "type",
  "type.builtin",
  "variable",
  "variable.parameter",
  "variable.special",
  "variant",
]);

const repoRoot = path.resolve(__dirname, "..");
const highlightsPath = path.join(
  repoRoot,
  "languages",
  "jsonl",
  "highlights.scm",
);

function readHighlights() {
  return fs.readFileSync(highlightsPath, "utf8");
}

function captureNames(query) {
  // Match `@name` patterns, including dotted suffixes like `@string.escape`.
  const captures = new Set();
  const re = /@([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*)/g;
  for (const match of query.matchAll(re)) {
    captures.add(match[1]);
  }
  return captures;
}

function listNodeNames() {
  const nodeTypesPath = path.join(
    repoRoot,
    "grammars",
    "json",
    "src",
    "node-types.json",
  );
  if (!fs.existsSync(nodeTypesPath)) {
    // Skip tests that depend on the grammar node-types.json when the
    // compiled grammar hasn't been built yet (CI/dev machines without
    // the wasm build step).
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(nodeTypesPath, "utf8"));
  const names = new Set();
  function visit(node) {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node && typeof node === "object") {
      if (typeof node.type === "string") names.add(node.type);
      if (Array.isArray(node.subtypes)) visit(node.subtypes);
      if (Array.isArray(node.children)) visit(node.children);
    }
  }
  visit(raw);
  return names;
}

test("every capture in highlights.scm is a Zed-standard capture name", () => {
  const query = readHighlights();
  const captures = captureNames(query);

  assert.ok(captures.size > 0, "highlights.scm must contain at least one capture");

  for (const name of captures) {
    assert.ok(
      ZED_STANDARD_CAPTURES.has(name),
      `unknown capture "@${name}" in highlights.scm; expected one of the ` +
        `Zed-standard captures listed at https://zed.dev/docs/extensions/languages#syntax-highlighting`,
    );
  }
});

test("highlights.scm captures keys, strings, numbers and constants", () => {
  const captures = captureNames(readHighlights());

  assert.ok(
    captures.has("property"),
    "highlights.scm must declare a @property capture so object keys get a distinct color",
  );
  assert.ok(
    captures.has("string"),
    "highlights.scm must declare a @string capture",
  );
  assert.ok(
    captures.has("number"),
    "highlights.scm must declare a @number capture so numbers are not colored as strings",
  );
  assert.ok(
    captures.has("constant.builtin"),
    'highlights.scm must declare a @constant.builtin capture for true/false/null',
  );
  assert.ok(
    captures.has("comment"),
    "highlights.scm must declare a @comment capture",
  );
});

test("pair key capture is registered after the @string capture", () => {
  const query = readHighlights();
  const stringIndex = query.indexOf("(string) @string");
  const pairKeyIndex = query.indexOf("pair\n  key: (string) @property");

  assert.ok(
    stringIndex !== -1,
    "expected a `(string) @string` rule in highlights.scm",
  );
  assert.ok(
    pairKeyIndex !== -1,
    "expected a `pair key: (string) @property` rule in highlights.scm",
  );
  assert.ok(
    pairKeyIndex > stringIndex,
    "the `pair key: (string) @property` rule must come AFTER `(string) @string` " +
      "so that, when both rules match the same range (object keys), Zed keeps the " +
      "later rule's capture (@property) instead of falling back to @string.",
  );
});

test("query targets only node names declared by tree-sitter-json", () => {
  const names = listNodeNames();
  if (names === null) {
    return; // node-types.json not generated yet; nothing to assert.
  }
  const referenced = new Set();
  // Capture node references of the form `(...)` where ... is either a
  // bare identifier or the empty pair/capture `""` (anonymized literal).
  const nodeRefRe = /\(([a-z_][a-z0-9_]*)\)/g;
  for (const match of readHighlights().matchAll(nodeRefRe)) {
    referenced.add(match[1]);
  }
  // `escape_sequence` is not a top-level node in node-types.json (it's a
  // child rule of `_string_content`), so filter it out before asserting.
  const skip = new Set(["escape_sequence"]);
  for (const name of referenced) {
    if (skip.has(name)) continue;
    assert.ok(
      names.has(name),
      `query references node "${name}" which is not declared in the ` +
        `tree-sitter-json grammar; check for typos against the node-types.json file.`,
    );
  }
});
