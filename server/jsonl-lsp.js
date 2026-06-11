"use strict";

const documents = new Map();
let buffer = Buffer.alloc(0);

function preferredLineEnding(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function hasFinalLineEnding(text) {
  return /\r?\n$/.test(text);
}

function isWhitespace(ch) {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function syntaxError(message, index) {
  const error = new Error(`${message} at offset ${index}`);
  error.offset = index;
  return error;
}

function readJsonStringEnd(text, start) {
  let escaped = false;

  for (let index = start + 1; index < text.length; index += 1) {
    const ch = text[index];

    if (escaped) {
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else if (ch === "\"") {
      return index + 1;
    }
  }

  throw syntaxError("Unterminated string", start);
}

function readJsonContainerEnd(text, start) {
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  const stack = [close];
  let index = start + 1;

  while (index < text.length) {
    const ch = text[index];

    if (ch === "\"") {
      index = readJsonStringEnd(text, index);
      continue;
    }

    if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? "}" : "]");
    } else if (ch === "}" || ch === "]") {
      if (stack.pop() !== ch) {
        throw syntaxError(`Unexpected '${ch}'`, index);
      }

      if (stack.length === 0) {
        return index + 1;
      }
    }

    index += 1;
  }

  throw syntaxError(`Unterminated '${open}'`, start);
}

function readJsonPrimitiveEnd(text, start) {
  let index = start;

  while (index < text.length && !isWhitespace(text[index])) {
    index += 1;
  }

  return index;
}

function parseJsonValues(text) {
  const values = [];
  let index = 0;

  while (index < text.length) {
    while (index < text.length && isWhitespace(text[index])) {
      index += 1;
    }

    if (index >= text.length) {
      break;
    }

    const start = index;
    const ch = text[index];
    let end;

    if (ch === "{" || ch === "[") {
      end = readJsonContainerEnd(text, index);
    } else if (ch === "\"") {
      end = readJsonStringEnd(text, index);
    } else {
      end = readJsonPrimitiveEnd(text, index);
    }

    const source = text.slice(start, end);

    validateJsonValue(source, start);
    values.push(source);

    index = end;
  }

  return values;
}

function validateJsonValue(source, offset) {
  try {
    JSON.parse(source);
  } catch (error) {
    throw syntaxError(error.message, offset);
  }
}

function indentation(level, indent) {
  return " ".repeat(level * indent);
}

function nextNonWhitespace(text, start) {
  for (let index = start; index < text.length; index += 1) {
    if (!isWhitespace(text[index])) {
      return text[index];
    }
  }

  return "";
}

function prettyPrintJsonSource(source, indent, eol) {
  let output = "";
  let level = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const ch = source[index];

    if (inString) {
      output += ch;

      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }

      continue;
    }

    if (isWhitespace(ch)) {
      continue;
    }

    switch (ch) {
      case "\"":
        output += ch;
        inString = true;
        break;

      case "{":
      case "[":
        output += ch;
        level += 1;
        if (nextNonWhitespace(source, index + 1) !== (ch === "{" ? "}" : "]")) {
          output += eol + indentation(level, indent);
        }
        break;

      case "}":
      case "]": {
        const previous = output.trimEnd().at(-1);
        level -= 1;

        if (previous === "{" || previous === "[") {
          output = output.trimEnd() + ch;
        } else {
          output = output.trimEnd() + eol + indentation(level, indent) + ch;
        }
        break;
      }

      case ",":
        output = output.trimEnd() + "," + eol + indentation(level, indent);
        break;

      case ":":
        output = output.trimEnd() + ": ";
        break;

      default:
        output += ch;
    }
  }

  return output.trim();
}

function formatJsonl(text, options = {}) {
  const indent = Number.isInteger(options.tabSize) && options.tabSize > 0
    ? options.tabSize
    : 2;
  const eol = preferredLineEnding(text);
  const values = parseJsonValues(text);
  const formatted = values
    .map((source) => prettyPrintJsonSource(source, indent, eol))
    .join(eol);

  return formatted + (hasFinalLineEnding(text) && formatted.length > 0 ? eol : "");
}

function documentEndPosition(text) {
  const lines = text.split(/\r\n|\r|\n/);

  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
  };
}

function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

function respond(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function respondError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function handleRequest(message) {
  switch (message.method) {
    case "initialize":
      respond(message.id, {
        capabilities: {
          textDocumentSync: 1,
          documentFormattingProvider: true,
        },
        serverInfo: {
          name: "jsonl-formatter",
          version: "0.2.0",
        },
      });
      break;

    case "shutdown":
      respond(message.id, null);
      break;

    case "textDocument/formatting": {
      const uri = message.params.textDocument.uri;
      const text = documents.get(uri);

      if (text === undefined) {
        respond(message.id, []);
        break;
      }

      try {
        const newText = formatJsonl(text, message.params.options || {});
        respond(message.id, [{
          range: {
            start: { line: 0, character: 0 },
            end: documentEndPosition(text),
          },
          newText,
        }]);
      } catch (error) {
        respondError(message.id, -32602, error.message);
      }
      break;
    }

    default:
      if (Object.prototype.hasOwnProperty.call(message, "id")) {
        respond(message.id, null);
      }
  }
}

function handleNotification(message) {
  switch (message.method) {
    case "textDocument/didOpen":
      documents.set(message.params.textDocument.uri, message.params.textDocument.text);
      break;

    case "textDocument/didChange": {
      const change = message.params.contentChanges[message.params.contentChanges.length - 1];
      if (change && typeof change.text === "string") {
        documents.set(message.params.textDocument.uri, change.text);
      }
      break;
    }

    case "textDocument/didClose":
      documents.delete(message.params.textDocument.uri);
      break;

    case "exit":
      process.exit(0);
      break;
  }
}

function handleMessage(message) {
  if (Object.prototype.hasOwnProperty.call(message, "id")) {
    handleRequest(message);
  } else {
    handleNotification(message);
  }
}

function processInput() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }

    const header = buffer.slice(0, headerEnd).toString("ascii");
    const match = header.match(/Content-Length:\s*(\d+)/i);

    if (!match) {
      throw new Error("Missing Content-Length header");
    }

    const contentLength = Number(match[1]);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + contentLength;

    if (buffer.length < bodyEnd) {
      return;
    }

    const body = buffer.slice(bodyStart, bodyEnd).toString("utf8");
    buffer = buffer.slice(bodyEnd);
    handleMessage(JSON.parse(body));
  }
}

function startServer() {
  process.stdin.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    processInput();
  });
}

if (process.argv.includes("--stdio") || __filename === "[eval]") {
  startServer();
}

module.exports = {
  formatJsonl,
  parseJsonValues,
};
