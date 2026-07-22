"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const CONFIG_PATH = "languages/jsonl/config.toml";
const QUERY_NODE_TYPES = new Set([
  "array",
  "comment",
  "document",
  "escape_sequence",
  "false",
  "null",
  "number",
  "object",
  "pair",
  "string",
  "string_content",
  "true",
]);

function readConfig() {
  return fs.readFileSync(CONFIG_PATH, "utf8");
}

function lintQuery(filePath, source) {
  let depth = 0;
  const nodeTypes = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === ";") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (character === '"') {
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          break;
        }
        index += 1;
      }
      continue;
    }

    if (character === "(") {
      depth += 1;
      let nodeStart = index + 1;
      while (/\s/.test(source[nodeStart] ?? "")) {
        nodeStart += 1;
      }
      const match = source.slice(nodeStart).match(/^([A-Za-z_][A-Za-z0-9_]*)/);
      if (match && match[1] !== "_") {
        nodeTypes.add(match[1]);
      }
    } else if (character === ")") {
      depth -= 1;
      assert.ok(depth >= 0, `${filePath} closes more parentheses than it opens`);
    }
  }

  assert.equal(depth, 0, `${filePath} has unbalanced parentheses`);
  for (const nodeType of nodeTypes) {
    assert.ok(
      QUERY_NODE_TYPES.has(nodeType),
      `${filePath} references unknown JSON node type ${nodeType}`,
    );
  }
}

test("config declares all JSON Lines path suffixes", () => {
  const config = readConfig();
  const pathSuffixes = config.match(/^path_suffixes\s*=\s*\[([^\]]*)\]/m);

  assert.ok(pathSuffixes, "config declares path_suffixes");
  assert.match(pathSuffixes[1], /"jsonl"/);
  assert.match(pathSuffixes[1], /"ndjson"/);
  assert.match(pathSuffixes[1], /"ldjson"/);
});

test("config preserves the JSON grammar and language name", () => {
  const config = readConfig();

  assert.match(config, /^grammar\s*=\s*"json"$/m);
  // Downstream language-server/client extensions bind to this exact language name string, so renaming it would detach them.
  assert.match(config, /^name\s*=\s*"JSON Lines"$/m);
});

test("config declares the object bracket pair", () => {
  const config = readConfig();

  assert.ok(
    config.includes(
      '    { start = "{", end = "}", close = true, surround = true, newline = true },',
    ),
  );
});

test("config declares the array bracket pair", () => {
  const config = readConfig();

  assert.ok(
    config.includes(
      '    { start = "[", end = "]", close = true, surround = true, newline = true },',
    ),
  );
});

test("config declares string-aware quote pairing", () => {
  const config = readConfig();

  assert.ok(
    config.includes(
      String.raw`    { start = "\"", end = "\"", close = true, surround = true, newline = false, not_in = ["string"] },`,
    ),
  );
});

const QUERY_CAPTURES = new Map([
  ["languages/jsonl/brackets.scm", ["@open", "@close"]],
  ["languages/jsonl/indents.scm", ["@indent", "@end"]],
  ["languages/jsonl/outline.scm", ["@item", "@name"]],
  [
    "languages/jsonl/highlights.scm",
    [
      "@string.special.key",
      "@string",
      "@number",
      "@constant.builtin",
      "@escape",
      "@comment",
    ],
  ],
]);

for (const [filePath, captures] of QUERY_CAPTURES) {
  test(`${filePath} is balanced and uses valid JSON node types`, () => {
    const source = fs.readFileSync(filePath, "utf8");

    lintQuery(filePath, source);
    for (const capture of captures) {
      assert.ok(source.includes(capture), `${filePath} contains ${capture}`);
    }
  });
}

test("empty-object outline matching retains its anchors", () => {
  const outline = fs.readFileSync("languages/jsonl/outline.scm", "utf8");

  // Without these anchors, (object "{" "}") matches every object, listing non-empty records twice via both object rules.
  assert.match(outline, /\(object\s+\.\s+"\{"\s+\.\s+"\}"\s+\.\s*\)/);
});
