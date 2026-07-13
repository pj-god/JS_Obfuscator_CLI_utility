import parser from '@babel/parser'
import traverseModule from '@babel/traverse'
import generator from '@babel/generator'

const traverse = traverseModule.default
const generate = generator.default

const RESERVED_GLOBALS = new Set([
  'console', 'log', 'window', 'document', 'process', 'global', 'globalThis',
  'Math', 'Array', 'Object', 'JSON', 'Promise', 'Number', 'String', 'Boolean',
  'Error', 'TypeError', 'RangeError', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Symbol', 'Proxy', 'Reflect', 'RegExp', 'Date', 'Function', 'Infinity',
  'NaN', 'undefined', 'require', 'module', 'exports', '__dirname', '__filename',
  'Buffer', '_0xStringPool', '_0xDecode', '_0xK'
]);

const usedHexNames = new Set()

function generateHexName () {
    let name;
    do {
        name = `_0x${Math.floor(Math.random() * 0xFFFFFF).toString(16)}`
    } while(usedHexNames.has(name)) {
        usedHexNames.add(name)
        return name
    }
}

function encodeString(str, key) {
  const b64 = Buffer.from(str, 'utf8').toString('base64');
  let out = '';
  for (let i = 0; i < b64.length; i++) {
    out += String.fromCharCode(b64.charCodeAt(i) ^ key);
  }
  return Buffer.from(out, 'binary').toString('base64');

function injectDeadCode(ast) {
  const decoySources = [
    `if (Math.random() > 2) { (function(){ let _0xd = [1,2,3].map(x => x * 2); return _0xd.join(''); })(); }`,
    `if (typeof undefined !== 'undefined') { let _0xd = Date.now() - Date.now(); }`,
    `if (0x1 === 0x2) { (function(){ return Math.sqrt(-1); })(); }`
  ];

  const injections = 1 + Math.floor(Math.random() * 2); // 1-2 decoys
  for (let i = 0; i < injections; i++) {
    const src = decoySources[Math.floor(Math.random() * decoySources.length)];
    const decoy = parser.parse(src).program.body[0];
    const insertAt = Math.floor(Math.random() * (ast.program.body.length + 1));
    ast.program.body.splice(insertAt, 0, decoy);
  }
}
