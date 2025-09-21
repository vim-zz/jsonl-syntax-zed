# JSONL Syntax - Zed Extension

A Zed editor extension that provides syntax highlighting for JSON Lines (JSONL) and Newline Delimited JSON (NDJSON) files.

## Overview

JSON Lines is a format for storing structured data with one JSON object per line. Each line is a valid JSON value, making it suitable for streaming and processing large datasets.

```jsonl
{"name": "John", "age": 30}
{"name": "Jane", "age": 25}
{"name": "Bob", "age": 35}
```

## Features

- Syntax highlighting for `.jsonl` and `.ndjson` files
- Automatic file detection
- Tree-sitter JSON parser for accurate highlighting
- 2-space indentation default
- Performance optimized for large files

## Installation

### Development Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/[your-username]/jsonl-syntax
   cd jsonl-syntax
   ```

2. In Zed, open command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)

3. Run "zed: install dev extension" and select the `jsonl-syntax` folder

## Usage

Open any `.jsonl` or `.ndjson` file in Zed to see syntax highlighting automatically applied.

## Development

### Project Structure

```
jsonl-syntax/
├── extension.toml          # Extension configuration
├── languages/
│   └── jsonl/
│       ├── config.toml     # Language settings
│       └── highlights.scm  # Highlighting rules
├── sample.jsonl           # Test file
└── validate.py           # Validation script
```

### Making Changes

1. Edit highlighting rules in `languages/jsonl/highlights.scm`
2. Modify language settings in `languages/jsonl/config.toml`
3. Reload extensions in Zed: "zed: reload extensions"
4. Test changes with sample files

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Technical Details

This extension uses the tree-sitter-json grammar for parsing. Each JSONL line is treated as a separate JSON document for highlighting purposes.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Resources

- [JSON Lines Format Specification](http://jsonlines.org/)
- [Tree-sitter JSON Grammar](https://github.com/tree-sitter/tree-sitter-json)
- [Zed Editor](https://zed.dev)
