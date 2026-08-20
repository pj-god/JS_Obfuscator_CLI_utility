# JS-OBFUSCATOR CLI UTILITY

A lightweight, AST-based JavaScript/JSX obfuscator built on Babel. Pools and encodes string literals, renames local identifiers to scope-safe hex names, hex-ifies numeric literals, and injects dead-code decoys — all exposed through a simple CLI.

> **Note on scope:** this tool raises the bar against casual inspection of source code. It is **not** a substitute for proper security practices (server-side secrets, access control, etc.) and will not stop a determined, tooled-up adversary. Treat it as a deterrent, not a lock.

## Features

- 🧵 **String pooling** — all string literals are extracted into a single array and referenced by index
- 🔐 **String encoding** — pooled strings are base64 + XOR encoded and decoded at runtime (optional)
- 🏷️ **Scope-aware identifier mangling** — local variables/functions are renamed to `_0x...` hex names using Babel's binding resolution, so same-named variables in different scopes are never accidentally merged
- 🔢 **Numeric literal hex-ification** — integers are rewritten in hex form (`10` → `0xa`)
- 🎭 **Dead code injection** — unreachable decoy branches are spliced in at random positions
- ⚛️ **JSX-safe** — string replacements inside JSX attributes are correctly wrapped in expression containers
- ✅ **Directive-safe** — `"use strict"` and other directive prologues are never disturbed by injected code
- ⚙️ **Configurable** — toggle mangling, string encoding, and dead code injection independently via CLI flags

## Installation

```bash
git clone <your-repo-url>
cd js-obfuscator
npm install
```

### Requirements

- Node.js 18+ (ESM support required — this project uses `"type": "module"`)
- Babel 8.x (`@babel/core`, `@babel/parser`, `@babel/traverse`, `@babel/generator`)

## Usage

### Basic

```bash
node index.js path/to/file.js
```

Produces `path/to/file.obf.js` by default.

### Custom output path

```bash
node index.js src/app.js -o dist/app.min.js
```

### Print to stdout

```bash
node index.js src/app.js --stdout > dist/app.obf.js
```

### Selective obfuscation

```bash
# Skip identifier renaming
node index.js src/app.js --no-mangle

# Leave strings in a plain (unencoded) pool
node index.js src/app.js --no-encode-strings

# Skip dead code injection
node index.js src/app.js --no-dead-code

# Combine flags
node index.js src/app.js --no-mangle --no-dead-code
```

### Run as a global command (optional)

```bash
chmod +x index.js
npm link
obfuscate src/app.js
```

## CLI Reference

| Flag | Description | Default |
|---|---|---|
| `<input>` | Path to the source `.js` / `.jsx` / `.mjs` file (required) | — |
| `-o, --output <path>` | Output file path | `<input>.obf.<ext>` |
| `--no-mangle` | Skip identifier mangling | mangling **on** |
| `--no-encode-strings` | Store pooled strings in plaintext instead of encoding | encoding **on** |
| `--no-dead-code` | Skip dead code injection | injection **on** |
| `--stdout` | Print result to stdout instead of writing a file | off |
| `-V, --version` | Print the CLI version | — |
| `-h, --help` | Show help | — |

## How it works

1. **Parse** — source is parsed into an AST via `@babel/parser`, with JSX, TypeScript, and legacy decorator syntax enabled.
2. **String pooling** — every string literal (excluding import/export specifiers and directive prologues) is deduplicated into a `_0xStringPool` array and replaced with an indexed lookup. JSX attribute values are wrapped in `{}` as required by JSX syntax; non-computed object/class property keys are flipped to computed when swapped.
3. **Identifier mangling** — each `Identifier` is resolved to its Babel scope `Binding`. Bindings (not raw name strings) are mapped to randomly generated, collision-checked hex names, so two unrelated variables sharing a name in different scopes are never conflated. Builtins, global objects, property-access names, and import/export specifier names are left untouched.
4. **Number hex-ification** — integer literals are rewritten with a hex `raw` representation.
5. **Dead code injection** — one or two unreachable decoy branches are spliced into the program body, inserted only after any existing directive prologue (e.g. `"use strict"`).
6. **String pool emission** — the pool is injected as either a plain array or, by default, a base64+XOR-encoded array with an inline decoder, positioned after the directive prologue.
7. **Generate** — the modified AST is regenerated into compact, comment-free output via `@babel/generator`.

## Known limitations

- **Reversibility** — the XOR key is stored alongside the encoded data in the same file, so a motivated reader can trivially decode strings by running the included decoder. This is intentional (self-decoding output requires the key to be present) but means this is not cryptographically secure obfuscation.
- **Template literals** are not pooled — interpolated strings (`` `Hello ${name}` ``) pass through unmodified.
- **JSX component tag names** (`<MyComponent />`) are not renamed.
- **Object/class property and method names** are intentionally left readable, since safely renaming them would require full call-site analysis.
- **Browser environments** — the string decoder relies on Node's `Buffer`. If your obfuscated output needs to run directly in a browser without a bundler polyfill, swap the `Buffer`-based encode/decode for `btoa`/`atob`.
- No control-flow flattening — this is a structural (not semantic) obfuscator.

## Project structure

```
.
├── index.js          # CLI entry point (commander-based)
├── transformer.js     # Core obfuscation logic (AST transforms)
├── package.json
└── README.md
```

## Roadmap / possible improvements

- [ ] `--batch <dir>` flag for recursive directory obfuscation
- [ ] Template literal string pooling
- [ ] Runtime-derived XOR key instead of an inline constant
- [ ] Test suite covering JSX, directives, shorthand properties, and scope edge cases
- [ ] Optional control-flow flattening pass

## License

ISC
