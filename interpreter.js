'use strict';

const {precedence, prefixes, suffixes, brackets} = require('./tokens.js');

const
/**
 * Operator definitions and precedence for RPN
 */
 operators = {

  functions: {

    '+' : (left, right, tl, tr) =>
    // TODO: finish
      tl == 'A' && tr == 'A' ? left.concat(right)
    : tl == 'S' && tr == 'S' ? '"' + left.concat(toString(right)) + '"'
    : left*1 + right*1
    ,
    '-' : (left, right, tl, tr) =>
    // TODO: finish
      tl == 'S' ? left.replace(right, '')
      : left*1 - right*1
    ,
    '*' : (left, right, tl, tr) =>
    // TODO: finish
      tl == 'S' ? left.match(right)
      : left*1 * right*1
      ,
    '/' : (left, right, tl, tr) =>
    // TODO: finish
      tl == 'S' && tr == 'N' ? left.match(new RegExp('.{1,' + right + '}', 'g'))
      : left*1 / right*1.0
      ,
    '^': (left, right, tl, tr) => null
    // TODO: finish
      ,
    '%' : (left, right, tl, tr) =>
    // TODO: finish
      tl == 'S' && tr == 'A' && right[0].length >= 2 ? left.replace(right[0], right[1])
      : left*1 % right*1
      ,
    '**': (left, right, tl, tr) =>
    // TODO: finish
      Math.pow(left*1, right*1)
      ,
    '//': (left, right, tl, tr) =>
    // TODO: finish
      tl == 'N' && right == 2 ? Math.sqrt(left)
      : Math.pow(left*1, 1 / right)
      ,
    '%%': (left, right, tl, tr) => null
    // TODO: finish
      ,
    '@' : (left, right, tl, tr) =>
    // TODO: finish
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
    // TODO: finish
      ,
    '&' : (left, right, tl, tr) => left && right
    // TODO: finish
      ,
    '||': (left, right, tl, tr) => left | right
    // TODO: finish
      ,
    '|' : (left, right, tl, tr) => left || right
    // TODO: finish
      ,
    '^^' : (left, right, tl, tr) => left ^ right
    // TODO: finish
      ,
    '<' : (left, right, tl, tr) =>
    // TODO: finish
      tl == 'S' ? left != right && right.indexOf(left) > -1
      : left*1 < right*1
      ,
    '<=': (left, right, tl, tr) =>
    // TODO: finish
      tl == 'S' ? right.indexOf(left) > -1
      : left*1 <= right*1
      ,
    '>' : (left, right, tl, tr) =>
    // TODO: finish
      tl == 'S' ? left != right && left.indexOf(right) > -1
      : left*1 > right*1
      ,
    '>=': (left, right, tl, tr) =>
    // TODO: finish
      tl == 'S' ? left.indexOf(right) > -1
      : left*1 >= right*1
      ,
    '!=': (left, right, tl, tr) => left != right
    // TODO: finish
      ,
    '==': (left, right, tl, tr) => left == right
    // TODO: finish
      ,
    '$' : (left, right, tl, tr) => right.length || 0
    // TODO: finish
      ,
    '++': (left, right, tl, tr) => null
    // TODO: finish
    ,
    '--': (left, right, tl, tr) => null
    // TODO: finish
    ,
    '@@': (left, right, tl, tr) => null
    // TODO: finish
    ,
    '>>': (left, right, tl, tr) => null
    // TODO: finish
    ,
    '<<': (left, right, tl, tr) => null
    // TODO: finish
    ,
  },
};

/**
 * Runs the code, returning the state (assigned variables) and results (non-assigned expression evaluations ordered chronologically)
 * Tracks resolved tokens (unfortunately we need to do this since variable/member assignment is a bit more complicated than RPN calculation)
 */
const interpret = (code) => {

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
            variables = nestedSet(variables, op1, op2);
          }
        } else {
          while (stack.length && (typeof op1 != 'string' || !op1.match(/^[_a-z][_a-z0-9]*$/))) {
            op1 = resolveOperand(variables, stack, {skipAccessor: true});
          }
          variables[op1] = op2;
        }
        stack.push(op2);

      } else {
        if (op1 === undefined && op2 === undefined) {
          continue;
        }

        value = evaluate('bin', tokens[idx], op1, op2, {'tokens': tokens, 'variables': variables, 'arguments': code.arguments || {}});
        if (typeof value === 'undefined') value = null;
        stack.push(value);
      }

    } else if (instruction = tokens[idx].match(/^<(?!fn)([^:]+):([^:]+)(:.+)?>$/)) { // instructions

      if (instruction[1] == 'jmpz') {
        if (!peek(stack)) {
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
      if (typeof tokens[idx] === 'undefined') tokens[idx] = null;
      stack.push(tokens[idx]);
    }

  }

  return { state: variables, return: peek(results) };
}

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

  if (typeof value === 'undefined') return null;
  return value;
}

/**
 * Sets an element in a nested structure, e.g. in a multidimensional array or complex JSON
 * If this is an array and key (index) is out of bounds, fill the array with nulls up to that point
 */
const nestedSet = function (array, keys, value) {
  let key, idx;

  if (Array.isArray(keys)) {
    while (Array.isArray(keys[0])) {
      keys = keys[0].concat(keys.slice(1));
    }
    key = keys.shift();
  }

  if (keys.length) {
    array[key] = nestedSet(array[key], keys, value);

  } else {
    if (Array.isArray(array) && key>0) {
      for (idx = key-1; array[idx] === undefined; idx--) {
        array[idx] = null;
      }
    }
    array[key] = value;
  }

  return array;
}

const toString = (value) => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

const peek = (array, level = 0) => level == 0 ?
    array[array.length-1] : peek(array[array.length-1], level-1)
;

const nunshift = (array, value, level) => {
  if (!(level > 0)) {
    array.unshift(value);
  } else if (level == 1) {
    array[0] = [value].concat(array[0]);
  } else {
    array[0] = nunshift(array[0], value, level-1);
  }
  return array;
}

/**
 * Given stack and variables, resolve next operand (read, cast and evaluate if neccessary)
 */
const resolveOperand = (variables, stack, options = {}) => {

  let bracketstack = [], entity = [];
  let peeked = peek(stack),
    operand, addr, functiondef, functioninst, innervars;

  if (peeked && peeked.match && (addr = peeked.match(/^<fn:([^:]+)(:.+)?>$/))) {
    stack.pop();
    if (addr[1] > -1) {
      if (!variables['__functions'] || !variables['__functions'][addr[1]]) {
        throw 'Function not found!';
      }
      functiondef = variables['__functions'][addr[1]];

    }

    return functiondef;
  }

  if (typeof peeked === 'string' && peeked[0] == '"') {
    return stack.pop();
  }

  if (peeked == ']') {

    for (; stack.length ;) {
      peeked = peek(stack);

      if (peeked == '[') { // peek
        stack.pop();
        bracketstack.pop();
        continue;

      } else if (peeked == ']') {
        entity = nunshift(entity, [], bracketstack.length);
        bracketstack.push(stack.pop());
        continue;
      }

      if (!bracketstack.length) { // validate here that brackets match?
        operand = entity[0];
        break;

      } else if (peek(stack) != ']') { // we need to evaluate array elements recursively (I think?)
          entity = nunshift(
            entity,
            resolveOperand(
              variables,
              [stack.pop()],
              options),
            bracketstack.length
            );
      }
    }

  } else if (peeked != null) {
    operand = stack.pop();

    if (!isNaN(parseFloat(operand)) && operand == parseFloat(operand)) {
      operand = parseFloat(operand);

    } else if (String.prototype.match.call(operand, /^[a-z_]+(\.([a-z_]+|[0-9]+))*$/)) {

      if (!options.skipAccessor) {

        if (typeof operand === 'numeric' ||
            typeof operand === 'boolean' ||
           (typeof operand === 'string' && operand[0] == '"') ||
           (['true','false','null'].indexOf(operand) > -1)) {
          // pass
        } else if (variables[operand] !== undefined) {
          operand = variables[operand];

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
 * Determines type for token during evaluation
 */
const type = (op) => {
  return ['true',true,'false',false,'null',null].indexOf(op) > -1 ? null
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
const cast = (op, typ) => {
  if (typ == 'S') return op.slice(1,-1);
  if (typ == 'N') return parseFloat(op);
  if (typ == 'A') return op.map(function(e) { return cast(e, type(e)); })
  if (!typ) {
    if (op == 'true')  return true;
    if (op == 'false') return false;
    if (op == 'null')  return null;
  }
  if (typeof op === 'undefined') return null;
  return op;
};

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
