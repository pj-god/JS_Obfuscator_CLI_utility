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
}

function injectDeadCode(ast) {
  const decoySources = [
    `if (Math.random() > 2) { (function(){ let _0xd = [1,2,3].map(x => x * 2); return _0xd.join(''); })(); }`,
    `if (typeof undefined !== 'undefined') { let _0xd = Date.now() - Date.now(); }`,
    `if (0x1 === 0x2) { (function(){ return Math.sqrt(-1); })(); }`
  ];

  const injections = 1 + Math.floor(Math.random() * 2); 
  for (let i = 0; i < injections; i++) {
    const src = decoySources[Math.floor(Math.random() * decoySources.length)];
    const decoy = parser.parse(src).program.body[0];
    const prologueEnd = getDirectivePrologueEnd(ast.program.body);
    const insertAt = prologueEnd + Math.floor(Math.random() * (ast.program.body.length - prologueEnd + 1));
    ast.program.body.splice(insertAt, 0, decoy);
  }
}

function getDirectivePrologueEnd(programBody) {
  let i = 0;
  while (i < programBody.length && programBody[i].type === 'ExpressionStatement' &&
         programBody[i].expression.type === 'StringLiteral') {
    i++;
  }
  return i;
}

export function obfuscateCode(sourceCode) {
  let ast;
  try {
    ast = parser.parse(sourceCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy']
    });
  } catch (err) {
    throw new Error(`Failed to parse source: ${err.message}`);
  }

  const stringPool = [];

  traverse(ast, {
    StringLiteral(path) {
      const parentType = path.parent.type;

      if (
        parentType === 'ImportDeclaration' ||
        parentType === 'ExportNamedDeclaration' ||
        parentType === 'ExportAllDeclaration' ||
        parentType === 'ImportSpecifier' ||
        parentType === 'ExportSpecifier' ||
        path.parentPath.isDirective?.()
      ) {
        return;
      }

      const stringValue = path.node.value;
      let poolIndex = stringPool.indexOf(stringValue);
      if (poolIndex === -1) {
        stringPool.push(stringValue);
        poolIndex = stringPool.length - 1;
      }

      const replacement = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: '_0xStringPool' },
        property: { type: 'NumericLiteral', value: poolIndex },
        computed: true
      };

      if (parentType === 'JSXAttribute') {
        path.replaceWith({
          type: 'JSXExpressionContainer',
          expression: replacement
        });
        path.skip();
        return;
      }

      if (
        (parentType === 'ObjectProperty' || parentType === 'ClassProperty') &&
        path.parent.key === path.node &&
        !path.parent.computed
      ) {
        path.parent.computed = true;
      }

      path.replaceWith(replacement);
      path.skip();
    }
  });

  const bindingNameMap = new Map();

  traverse(ast, {
    Identifier(path) {
      const name = path.node.name;

      if (RESERVED_GLOBALS.has(name)) return;

      if (
        path.parent.type === 'MemberExpression' &&
        path.parent.property === path.node &&
        !path.parent.computed
      ) {
        return;
      }
      if (
        (path.parent.type === 'ObjectProperty' || path.parent.type === 'ObjectMethod') &&
        path.parent.key === path.node &&
        !path.parent.computed &&
        !path.parent.shorthand
      ) {
        return;
      }
      if (path.parent.type === 'ClassMethod' && path.parent.key === path.node && !path.parent.computed) {
        return;
      }
      if (path.parent.type === 'ImportSpecifier' && path.parent.imported === path.node) return;
      if (path.parent.type === 'ExportSpecifier' && path.parent.exported === path.node) return;

      const binding = path.scope.getBinding(name);
      if (!binding) return;

      if (!bindingNameMap.has(binding)) {
        bindingNameMap.set(binding, generateHexName());
      }
      path.node.name = bindingNameMap.get(binding);
    },

    NumericLiteral(path) {
      if (Number.isInteger(path.node.value)) {
        path.node.extra = {
          rawValue: path.node.value,
          raw: `0x${path.node.value.toString(16)}`
        };
      }
    }
  });

  injectDeadCode(ast);

  if (stringPool.length > 0) {
    const xorKey = 1 + Math.floor(Math.random() * 200);
    const encodedPool = stringPool.map(s => encodeString(s, xorKey));

    const poolSrc = `
const _0xK = ${xorKey};
const _0xDecode = (s) => {
  let b = Buffer.from(s, 'base64').toString('binary');
  let o = '';
  for (let i = 0; i < b.length; i++) o += String.fromCharCode(b.charCodeAt(i) ^ _0xK);
  return Buffer.from(o, 'base64').toString('utf8');
};
const _0xStringPool = [${encodedPool.map(s => JSON.stringify(s)).join(',')}].map(_0xDecode);
`;
    const poolBody = parser.parse(poolSrc).program.body;
    const prologueEnd = getDirectivePrologueEnd(ast.program.body);
    ast.program.body.splice(prologueEnd, 0, ...poolBody);
  }

  try {
    const output = generate(ast, {
      compact: true,
      comments: false
    });
    return output.code;
  } catch (err) {
    throw new Error(`Failed to generate obfuscated code: ${err.message}`);
  }
}