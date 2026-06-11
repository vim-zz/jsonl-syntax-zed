"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const test = require("node:test");

function encode(message) {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

function createClient() {
  const serverSource = fs.readFileSync("server/jsonl-lsp.js", "utf8");
  const child = spawn(process.execPath, ["-e", serverSource], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  let buffer = Buffer.alloc(0);
  let nextId = 1;
  const pending = new Map();

  child.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        break;
      }

      const header = buffer.slice(0, headerEnd).toString("ascii");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      assert.ok(match, "LSP response has Content-Length");

      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + Number(match[1]);
      if (buffer.length < bodyEnd) {
        break;
      }

      const message = JSON.parse(buffer.slice(bodyStart, bodyEnd).toString("utf8"));
      buffer = buffer.slice(bodyEnd);

      if (pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    }
  });

  function request(method, params) {
    const id = nextId;
    nextId += 1;

    child.stdin.write(encode({ jsonrpc: "2.0", id, method, params }));

    return new Promise((resolve) => {
      pending.set(id, resolve);
    });
  }

  function notify(method, params) {
    child.stdin.write(encode({ jsonrpc: "2.0", method, params }));
  }

  function dispose() {
    child.kill();
  }

  return { request, notify, dispose };
}

test("formats a document through LSP", async () => {
  const client = createClient();

  try {
    const initialize = await client.request("initialize", {});
    assert.equal(initialize.result.capabilities.documentFormattingProvider, true);

    const uri = "file:///tmp/example.jsonl";
    client.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: "jsonl",
        version: 1,
        text: '{"a":1}\n{"b":2}\n',
      },
    });

    const response = await client.request("textDocument/formatting", {
      textDocument: { uri },
      options: { tabSize: 2, insertSpaces: true },
    });

    assert.equal(response.result[0].newText, '{\n  "a": 1\n}\n{\n  "b": 2\n}\n');
  } finally {
    client.dispose();
  }
});
