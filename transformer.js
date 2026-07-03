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