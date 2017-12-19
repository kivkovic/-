'use strict';

const {precedence, prefixes, suffixes, brackets} = require('./tokens.js');

/**
 * Utils
 */

/**
 * Nested peek: returns last elem of array optionally entering nested structure, e.g. for [1,[2,[3]]]: level=0 is [2,[3]], level=1 is [3], level=2 is 3
 * No argument or zero defaults to Array.prototype.peek(), negative returns this
 */
 Array.prototype.peek = function (level) {
  level = level || 0;
  return level < 0 ? this : level == 0 ?
    this[this.length-1] : this[this.length-1].peek(level-1);
}

/**
 * Nested unshift: finds first elem of array and appends the current value in front to it, entering n levels of nested structures
 * e.g. nunshift for [[[1],2],3]: level=0 will place value before [[1],2], level=1 will place it before [1], level=2 will place it before 1
 */
 Array.prototype.nunshift = function (value, level) {
  if (!(level > 0)) {
    this.unshift(value);
  } else if (level == 1) {
    this[0] = [value].concat(this[0]);
  } else {
    this[0].nunshift(value, level-1);
  }
}

/**
 * Sets an element in a nested structure, e.g. in a multidimensional array or complex JSON
 * If this is an array and key (index) is out of bounds, fill the array with nulls up to that point
 */
 Object.prototype.nestedSet = function (keys, value) {
  let key, idx;

  if (Array.isArray(keys)) {
    while (Array.isArray(keys[0])) {
      keys = keys[0].concat(keys.slice(1));
    }
    key = keys.shift();
  }

  if (keys.length) {
    this[key].nestedSet(keys, value);

  } else {
    if (Array.isArray(this) && key>0) {
      for (idx = key-1; this[idx] === undefined; idx--) {
        this[idx] = null;
      }
    }
    this[key] = value;
  }
}

/**
 * This isn't a prototype because it can't be overriden nicely for all possible values
 */
const toString = (value) => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/**
 * Globals
 */
 const
/**
 * Operator definitions and precedence for RPN
 */
 operators = {

  functions: {

    '+' : (left, right, tl, tr) =>
    // N+N     sum
    // A+A     concatenate
    // S+S     concatenate
    // A+F     reduce left using right
    // A+_     map: sum left's elems with right
    // F+F     curry
    // O+O     union (set)
      tl == 'A' && tr == 'A' ? left.concat(right)
    : tl == 'S' && tr == 'S' ? '"' + left.concat(toString(right)) + '"'
    : left*1 + right*1
    ,
    '-' : (left, right, tl, tr) =>
    // N-N     difference
    // A-A     element difference
    // A-F     inverse filter
    // A-_     map: subtract right from left's elems
    // S-_     remove all occurences
    // O-_     difference (set)
      tl == 'S' ? left.replace(right, '')
      : left*1 - right*1
    ,
    '*' : (left, right, tl, tr) =>
    // N*N     multiplication
    // A*A     zip
    // A*F     map
    // A*_     map: multiply left's elems with right
    // F*F     compose
    // O*O     cartesian product
      tl == 'S' ? left.match(right)
      : left*1 * right*1
      ,
    '/' : (left, right, tl, tr) =>
    // N/N     division
    // A/A     unzip
    // A/F     filter
    // A/_     map: divid left's elems with right
      tl == 'S' && tr == 'N' ? left.match(new RegExp('.{1,' + right + '}', 'g'))
      : left*1 / right*1.0
      ,
    '^': (left, right, tl, tr) => null
    // A^N     convert to base (from decimal)
    // A^{_:_} convert using base (key) to base (value)
    // N^N     exponentation
      ,
    '%' : (left, right, tl, tr) =>
    // N%N     modulo
    // A%F     for each loop over left, applying right
    // A%N     rotate by n positions right
    // S%N     rotate by n positions right
      tl == 'S' && tr == 'A' && right[0].length >= 2 ? left.replace(right[0], right[1])
      : left*1 % right*1
      ,
    '**': (left, right, tl, tr) =>
    // N**N    least common multiple
    // A**_    push
    // S**_    append
      Math.pow(left*1, right*1)
      ,
    '//': (left, right, tl, tr) =>
    // N//N    nth root
    // A//_    unshift
    // S//_    prepend
      tl == 'N' && right == 2 ? Math.sqrt(left)
      : Math.pow(left*1, 1 / right)
      ,
    '%%': (left, right, tl, tr) => null
    // N%%N    greatest common divisor
    // A%%_    join
      ,
    '@' : (left, right, tl, tr) =>
    // S@{_:_} regex replace with (reading key-value pairs)
    // S@_     regex search -- returns position-value array of matches
    // A@{_:_} replace with (reading key-value pairs)
    // A@_     find all -- returns position-value array of matches
    // O@_     find all by values -- returns key-value pairs
    // N@N     divisible by
      tl == 'S' ?
        tr == 'O' ?
          '"' + left.replace(new RegExp(Object.keys(right)[0], 'g'), right[Object.keys(right)[0]]) + '"'
        : left.match(new RegExp(right, 'g')) || []
      : tl == 'A' ?
          tr == 'O' ?
          left.map((e) => e != right[0] ? e : right[1])
        : left.reduce((list, e, i) => (e == right && list.push(i) || 1) && list, [])
      : tl == 'N' && tr == 'N' ?
        (left % right) == 0
      : null
      ,
    '&&': (left, right, tl, tr) => left & right
    // _&&_    bitwise and
      ,
    '&' : (left, right, tl, tr) => left && right
    // _&_     logical and (returns false or last evaluated true value)
      ,
    '||': (left, right, tl, tr) => left | right
    // _||_    bitwise or
      ,
    '|' : (left, right, tl, tr) => left || right
    // _|_     logical or (returns false or last evaluated true value)
      ,
    '^^' : (left, right, tl, tr) => left ^ right
    // S^^S    split by regex delimiter
    // _^^_    bitwise xor
      ,
    '<' : (left, right, tl, tr) =>
    // _<N     less than
    // _<A     strict unordered sublist of (contained by, not equal) -- returns idx+1, where idx is position (0 = false)
    // O<O     strict subset of (contained by, not equal)
    // _<S     is substring of, of smaller length (contained by, not equal) -- idx+1
      tl == 'S' ? left != right && right.indexOf(left) > -1
      : left*1 < right*1
      ,
    '<=': (left, right, tl, tr) =>
    // _<=N    less than or equal to
    // _<=A    unordered sublist of (contained by) -- idx+1
    // O<=O    subset of (contained by)
    // _<=S    substring of (contained by) -- idx+1
      tl == 'S' ? right.indexOf(left) > -1
      : left*1 <= right*1
      ,
    '>' : (left, right, tl, tr) =>
    // N>_     larger than
    // A>_     strict unordered superlist of (contains) -- idx+1
    // O>O     strict superset of (contained by, not equal)
    // S>_     is substring of smaller length (contains) -- idx+1
      tl == 'S' ? left != right && left.indexOf(right) > -1
      : left*1 > right*1
      ,
    '>=': (left, right, tl, tr) =>
    // N>=_    greater than or equal to
    // A>=_    unordered superlist of (contains) -- idx+1
    // O>=O    superset of (contained by)
    // S>=_    superstring of (contains) -- idx+1
      tl == 'S' ? left.indexOf(right) > -1
      : left*1 >= right*1
      ,
    '!=': (left, right, tl, tr) => left != right
    // _!=_    serialized not equal to
      ,
    '==': (left, right, tl, tr) => left == right
    // _==_    serialized equal to
      ,
    '$' : (left, right, tl, tr) => right.length || 0
    // N$      to integer
    // A$      length of
    // S$      unicode length of
    // O$      length of keys
      ,
    '++': (left, right, tl, tr) => null
    // N++     increment
    // O++     values to array
    // A++     sum reduce
    // S++     to uppercase
    ,
    '--': (left, right, tl, tr) => null
    // N--     decrement
    // F--     uncurry
    // O--     keys to array
    // A--     difference reduce
    // S--     to lowercase
    ,
    '@@': (left, right, tl, tr) => null
    // N@@     prime factors
    // O@@     swap keys with values
    // A@@     transpose
    // S@@     explode (split by each unicode character)
    ,
    '>>': (left, right, tl, tr) => null
    // N>>
    // O>>
    // A>>     pop
    // S>>     remove last unicode character
    ,
    '<<': (left, right, tl, tr) => null
    // N<<
    // O<<
    // A<<     shift
    // S<<     remove first unicode character
    ,
  },
};

/**
 * Given stack and variables, resolve next operand (read, cast and evaluate if neccessary)
 */
 const resolveOperand = (variables, stack, options = {}) => {

  let bracketstack = [], entity = [];
  let peek = stack.peek(),
    operand, addr, functiondef, functioninst, innervars;

  if (peek && peek.match && (addr = peek.match(/^<fn:([^:]+)(:.+)?>$/))) {
    stack.pop();
    if (addr[1] > -1) {
      if (!variables['__functions'] || !variables['__functions'][addr[1]]) {
        throw 'Function not found!';
      }
      functiondef = variables['__functions'][addr[1]];

    }

    return functiondef;
  }

  if (typeof peek === 'string' && peek[0] == '"') {
    return stack.pop();
  }

  if (peek == ']') {

    for (; stack.length ;) {
      peek = stack.peek();

      if (peek == '[') { // peek
        stack.pop();
        bracketstack.pop();
        continue;

      } else if (peek == ']') {
        entity.nunshift([], bracketstack.length);
        bracketstack.push(stack.pop());
        continue;
      }

      if (!bracketstack.length) { // validate here that brackets match?
        operand = entity[0];
        break;

      } else if (stack.peek() != ']') { // we need to evaluate array elements recursively (I think?)
          entity.nunshift(
            resolveOperand(
              variables,
              [stack.pop()],
              options),
            bracketstack.length
            );
      }
    }

  } else if (peek != null) {
    operand = stack.pop();

    if (!isNaN(parseFloat(operand)) && operand == parseFloat(operand)) {
      operand = parseFloat(operand);

    } else if (String.prototype.match.call(operand, /^[a-z_]+(\.([a-z_]+|[0-9]+))*$/)) {

      if (!options.skipAccessor) {
        if (variables[operand] !== undefined) {
          operand = variables[operand];

        } else if (typeof operand === 'numeric' || typeof operand === 'boolean' || (typeof operand === 'string' && operand[0] == '"')) {
          // nothing to see here
        } else if (operand == '_') {
          // recursion
        } else {
          throw 'Undefined variable "' + operand + '"!';
        }
      }
    }
  }

  return operand;
 }

/**
 * Runs the code, returning the state (assigned variables) and results (non-assigned expression evaluations ordered chronologically)
 * Tracks resolved tokens (unfortunately we need to do this since variable/member assignment is a bit more complicated than RPN calculation)
 */
 let interpret = (code) => {

  let stack = [], results = [], res = [],
  assign = 0, later = null, timeout = 0,
  variables, tokens, instruction, value, args, op1, op2, idx, jdx, kdx;

  variables = code.variables || {};
  tokens = code.tokens;

  for (idx=0; idx<tokens.length+1; idx++) {

    if (timeout >= 10000000) { // timeout after 10M jumps in one function
      results = { peek: () => 'Timeout' };
      break;

    } else if (tokens[idx] === undefined || tokens[idx] === ',') {
      continue;

    } else if (idx == tokens.length || tokens[idx] === ';') { // expression chain done

      for (res = []; stack.length; ) {
        res.unshift(resolveOperand(variables, stack));
      }
      results = results.concat(res);
      stack = [];

    } else if (precedence[tokens[idx]] > 15) { // brackets have precedence 10 and comma has 15

      if (suffixes[tokens[idx]]) {
        op2 = resolveOperand(variables, stack, {skipAccessor: tokens[idx] == '=' || tokens[idx] == '°'});
        op1 = null;

      } else {
        op2 = resolveOperand(variables, stack);
        op1 = resolveOperand(variables, stack, {skipAccessor: tokens[idx] == '=' || tokens[idx] == '°'});
      }

      if (tokens[idx] == '=') {
        if (Array.isArray(op1)) {

          if (op2 && op2['tokens'] && op2['variables']) {
            instruction = op1.shift();
            variables[instruction] = {
              '__function'  : op2['tokens']     ,
              '__arguments' : op1.shift() || [] ,
              '__variables' : op2['variables']  ,
            };

          } else {
            variables.nestedSet(op1, op2);
          }
        } else {
          while (stack.length && (typeof op1 != 'string' || !op1.match(/^[_a-z][_a-z0-9]*$/))) {
            op1 = resolveOperand(variables, stack, {skipAccessor: true});
          }
          variables[op1] = op2;
        }
        stack.push(op2);

      } else {
        if (op1 === undefined && op2 === undefined ) {
          continue;
        }

        value = evaluate('bin', tokens[idx], op1, op2, {'tokens': tokens, 'variables': variables, 'arguments': code.arguments || {}});
        stack.push(value);
      }

    } else if (instruction = tokens[idx].match(/^<(?!fn)([^:]+):([^:]+)(:.+)?>$/)) { // instructions

      if (instruction[1] == 'jmpz') {
        if (!stack.peek()) {
          idx = instruction[2]-1;
          timeout++;
        }

      } else if (instruction[1] == 'jmp') {
        idx = instruction[2]-1;
        timeout++;

      } else if (instruction[1] == 'exit') {
        idx = tokens.length - 1;
        continue;
      }

    } else {
      stack.push(tokens[idx]);
    }

  }

  return { state: variables, return: results.peek() };
}

/**
 * Determines type for token during evaluation
 */
let type = (op) => {
  return ['T','F','N'].indexOf(op) > -1 ? null
  : op && typeof op['__function'] != 'undefined' && typeof op['__arguments'] != 'undefined' ? 'F'
  : Array.isArray(op) ? 'A' // array
  : typeof op == 'object' ? 'O' // object
  : typeof op == 'string' && op[0] == '"' ? 'S' // string (this check always needs to be before "number")
  : parseFloat(op) == "op" ? 'N' // number
  : op != null && op != undefined ? 'V'
  : null
  ;
}

/**
 * Casts token to given type during evaluation
 */
let cast = (op, typ) => {
  if (typ == 'S') return op.slice(1,-1);
  if (typ == 'N') return parseFloat(op);
  if (typ == 'A') return op.map(function(e) { return cast(e, type(e)); })
  if (!typ) {
    if (op == 'T') return true;
    if (op == 'F') return false;
    if (op == 'N') return null;
  }
  return op;
};

/**
 * Evaluates an expression: determines operand types, casts them to native (js) types and calls operation method
 * Options allow for specific syntax such as non-evaluated assignment, e.g. a.3 = ... treats a.3 as a reference, not a value
 */
 const evaluate = (position, operator, op1, op2, options = {}) => {

  let args = {}, variables = options.variables || {};
  let tl, tr, value, idx;

  tl = type(op1);
  tr = type(op2);

  op1 = cast(op1, tl);
  op2 = cast(op2, tr);

  if (op1 == '_') {
    tl = 'F';
    op1 = {
      '__function' : options.tokens,
      '__arguments': options.arguments,
      '__variables': JSON.parse(JSON.stringify(options.variables))
    };
  }

  if (position == 'bin') {
    if (operator == '.') {

      if (tl == 'F') {

        for (idx = 0, args = {}; idx < op1['__arguments'].length; idx++) {
          args[op1['__arguments'][idx]] = op2[idx];
        }

        value = interpret({
          'tokens'    : op1['__function'],
          'arguments' : op1['__arguments'],
          'variables' : JSON.parse(JSON.stringify(Object.assign(op1['__variables'], args))) // a shitty way to pass nested functions
        })['return'];

      } else {
        value = op1[op2];
      }
    } else if (operator == '°') { // a shitty way to do nested assignment
        value = [op1, op2];

    } else {
      value = operators['functions'][operator].call(null, op1, op2, tl, tr);
    }
  }

  return value;
}

/**
 * API
 */
module.exports.run = (input) => {
  let code;
  try {
    code = JSON.parse(input);
  } catch (notJSON) {
    code = input;
  }
  try {
    return interpret(code);
  } catch (error) {
    return 'Interpreter error: ' + error;
  }
}
