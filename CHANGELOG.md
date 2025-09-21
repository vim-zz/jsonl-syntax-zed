# Changelog

All notable changes to the JSONL Syntax extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-15

### Added
- Initial release of JSONL Syntax extension
- Syntax highlighting for JSON Lines (.jsonl) files
- Syntax highlighting for Newline Delimited JSON (.ndjson) files
- Tree-sitter based parsing using the JSON grammar
- Support for all JSON data types (strings, numbers, booleans, null, objects, arrays)
- Proper highlighting for JSON keys, values, and escape sequences
- Default tab size of 2 spaces for JSONL files
- Sample JSONL file for testing

### Technical Details
- Uses tree-sitter-json grammar (commit: 001c28d7a29832b06b0e831ec77845553c89b56d)
- Extension ID: jsonl-syntax
- Schema version: 1
- Minimum Zed version: Compatible with current stable releases

---

## Release Notes

### Version 0.1.0
This is the initial release of the JSONL Syntax extension for Zed. The extension provides comprehensive syntax highlighting for JSON Lines files, making it easier to work with streaming JSON data, logs, and datasets that use the JSONL format.

Key features include:
- Full JSON syntax highlighting applied to each line
- Support for nested objects and arrays within JSONL records
- Proper color coding for different data types
- Automatic language detection based on file extensions

The extension leverages the robust tree-sitter-json parser, ensuring accurate and performant syntax highlighting even for large JSONL files.
