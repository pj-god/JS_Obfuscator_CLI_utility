#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import { Command } from 'commander';
import { obfuscateCode } from './transformer.js';

const program = new Command();

program
  .name('obfuscate')
  .description('Obfuscate a JavaScript/JSX file (string pooling, identifier mangling, dead code injection)')
  .version('1.0.0')
  .argument('<input>', 'path to the source .js/.jsx file')
  .option('-o, --output <path>', 'output file path (defaults to <input>.obf.js)')
  .option('--no-mangle', 'skip identifier mangling')
  .option('--no-encode-strings', 'skip string pool encoding (leave strings in plaintext)')
  .option('--no-dead-code', 'skip dead code injection')
  .option('--stdout', 'print result to stdout instead of writing a file')
  .action((input, options) => {
    const inputPath = resolve(process.cwd(), input);

    if (!existsSync(inputPath)) {
      console.error(`Error: input file not found: ${inputPath}`);
      process.exit(1);
    }

    const ext = extname(inputPath);
    if (!['.js', '.jsx', '.mjs'].includes(ext)) {
      console.error(`Error: unsupported file extension "${ext}". Expected .js, .jsx, or .mjs`);
      process.exit(1);
    }

    let source;
    try {
      source = readFileSync(inputPath, 'utf8');
    } catch (err) {
      console.error(`Error reading file: ${err.message}`);
      process.exit(1);
    }

    let result;
    try {
      result = obfuscateCode(source, {
        mangleIdentifiers: options.mangle,
        encodeStrings: options.encodeStrings,
        injectDeadCode: options.deadCode
      });
    } catch (err) {
      console.error(`Obfuscation failed: ${err.message}`);
      process.exit(1);
    }

    if (options.stdout) {
      process.stdout.write(result + '\n');
      return;
    }

    const outputPath = options.output
      ? resolve(process.cwd(), options.output)
      : inputPath.replace(ext, `.obf${ext}`);

    try {
      writeFileSync(outputPath, result, 'utf8');
      console.log(`✓ Obfuscated output written to ${outputPath}`);
    } catch (err) {
      console.error(`Error writing output file: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();