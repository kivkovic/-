'use strict';

/**
 * Tokens
 */
const {precedence, prefixes, suffixes, brackets, groups} = require('./tokens.js');

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
 * Converts all infix ops to postfix (RPN), since that's easier to work with
 */
 const toPostfix = (expression) => {

  const stack = [], output = [], brstack = [];

  for (let idx = 0; idx < expression.length; idx++) {

    let char = expression[idx];
    if (char === undefined) {
      continue;
    }

    if (brackets['open'][char]) {
      brstack.push(brackets['open'][char]);

      if (char == '[' || char == '{') {
        output.push(char);
      }
    }

    let br = brackets['close'][brstack.peek()];

    if (char == brstack.peek()) {
      while (stack.peek() != br) {
        output.push(stack.pop());
      }
      stack.pop();
      brstack.pop();

      if (char === ']' || char === '}') {
        output.push(char);
      }

    } else {

      while (!brackets['open'][char] && stack.length
        && ((precedence[stack.peek()]||100) >= (precedence[char]||100))) {
        output.push(stack.pop());
      }

      if ([',',';','?',':'].indexOf(char) == -1) {
        stack.push(char);
      } else {
        output.push(char);
      }
    }
  }

  while (stack.length) {
    output.push(stack.pop());
  }

  return output;
}

/**
 * Converts expression to tokens: groups strings and floats and multi-char operators,
 *   replaces prefix operators and some binary with equivalent binary ops for easier evaluation later
 */
 const tokenize = (expression) => {

  let brstack, idx, jdx, group, concat, esc, num, last, open,
    tokens = expression.split('');

  for (idx=0, esc=0, concat=-1; idx<tokens.length; idx++) { // group strings so we don't have to check if anything is unquoted
    if (tokens[idx] === '\\') {
      esc++;
    } else {
      if (tokens[idx] === '"' && !(esc%2)) {
        if (concat == -1) {
          concat++;
        } else {
          tokens[idx-concat] = tokens[idx-concat].concat(tokens[idx]);
          tokens[idx] = undefined;
          concat = -1;
        }
      }
      esc = 0;
    }

    if (concat > -1) {
      if (concat > 0) {
        tokens[idx-concat] = tokens[idx-concat].concat(tokens[idx]);
        tokens[idx] = undefined;
      }
      concat++;
    }
  }

  for (idx=0; idx<tokens.length; idx++) {
    if (tokens[idx] === '=') {
      brstack = tokens[idx-1] === ']' ? 1 : 0;
      for (jdx = idx-1-brstack; jdx>0 && ([';','{','}','?',':',','].indexOf(tokens[jdx]) == -1 || brstack); jdx--) {
        if (tokens[jdx] === '.') {
          tokens[jdx] = '°';

        } else if (tokens[jdx] === '[') {
          brstack--;

        } else if (tokens[jdx] === ']') {
          brstack++;
        }
      }
    }
    else if (tokens[idx] === 'F') {
      tokens[idx] = 'false';
    }
    else if (tokens[idx] === 'T') {
      tokens[idx] = 'true';
    }
    else if (tokens[idx] === 'N') {
      tokens[idx] = 'null';
    }
  }

  // a shitty filter that could've been done earlier
  tokens = tokens.filter((e) =>
    e != undefined && e != ' ' && e != '\n' && e != '\t');

  for (idx=1, concat=0, last=0; idx<tokens.length; idx++, concat=0) { // replace prefixes with binary ops, group numeric digits and multi-char infix operators

    if (tokens[idx-1] === undefined) {
      continue;

      } else if (tokens[idx-1] === '-') { // replace prefix - with -1*, so we can evaluate it as a binary op
        if (idx==2 || (idx<tokens.length-1 &&
          (precedence[tokens[idx-2]] && !suffixes[tokens[idx-2]]) || ['(','[',',',';'].indexOf(tokens[idx-2]) > -1)) {
          tokens.splice(idx-1, 1, '-1', '*');
          idx+=2;
        }

      } else if (tokens[idx-1] === '!' && !groups[tokens[idx-1]][tokens[idx]]) { // replace ! with false&, so we can evaluate it as a binary op
        tokens.splice(idx-1, 1, 'false', '&');
        idx++;

      } else if (tokens[idx-1] === '~') { // insert F before ~ so we can evaluate it as a binary op
        tokens.splice(idx-1, 1, 'false', '~');
        idx++;

      } else if (groups[tokens[idx-1]] && groups[tokens[idx-1]][tokens[idx]]) {
        tokens[idx-1] += tokens[idx];
        tokens[idx] = undefined;

      } else if (!isNaN(parseFloat(tokens[idx-1]))) {
        for (concat=0; idx < tokens.length; idx++, concat++) {
          if ((['-','.','e','E'].indexOf(tokens[idx]) == -1
            || (tokens[idx] == '-' && ['e','E'].indexOf(tokens[idx-1]) > -1))
            && isNaN(parseFloat(tokens[idx]))) {
            break;
          }

          tokens[idx-1-concat] = String.prototype.concat.call(tokens[idx-1-concat], tokens[idx]);
          tokens[idx] = undefined;
        }
      }
    }

    if (tokens.peek() != ';') { // because why not, that's why
      tokens.push(';');
    };

    return tokens.filter((e) =>
      e != undefined);
  }

/**
 * Translate flow constructs into intermediate instructions, extract functions
 */
 const assemble = (tokenArray, options = {}) => {

  let loops = [], conditions = [],
    bracketstack = [], argstack = [],
    tokens = tokenArray.map(e => e),
    variables = options.variables || {};

  let fn_id = 0, idx, jdx, kdx, open, last;


  variables['__functions'] = variables['__functions'] || [];

  for (idx=tokens.length-1, open=0, jdx=-1; idx>=0; idx--) {
    if (tokens[idx] === '}') {
      if (tokens[idx+1] === '=' && jdx === -1) {
        jdx=idx;
      }
      open++;
    } else if (tokens[idx] === '{') {
      open--;
    }

    if (!open && jdx>=0) {
      variables['__functions'].push(
        assemble(tokens.splice(idx+1, jdx-idx-1), {}));

      tokens[idx] = '<fn:' + fn_id + ':function>';
      tokens[idx+1] = undefined;
      fn_id++;
      jdx = -1;
    }
  }

  tokens = tokens.filter(e => e != undefined);

  for (idx=0, jdx=0, open=0, last=0, bracketstack = []; idx<tokens.length; idx++) {

    if (tokens[idx] === '[') {
      open++;
    } else if (tokens[idx] === ']') {
      open--;
    }

    if (tokens[idx] === ';' || tokens[idx] === ',') {
      jdx = idx;

    } else if (tokens[idx] === '{') {
      for (jdx=idx; jdx>=0; jdx--) {
        if (tokens[jdx].match(/^(;|,|<jmp:.+)$/)) {
          break;
        }
      }
      loops.push({ condition: jdx, start: idx });

    } else if (tokens[idx] === '}') {
      for (jdx=idx; jdx>=0; jdx--) {
        if (tokens[jdx] === '#!') {
          tokens[jdx] = '<jmp:' + (idx+1) + ':break>';
        } else if (tokens[jdx] === '#$') {
          tokens[jdx] = '<jmp:' + loops.peek().condition + ':continue>';
        }
      }

      tokens[idx] = '<jmp:' + loops.peek().condition + ':loop>';
      tokens[loops.pop().start] = '<jmpz:' + (idx+1) + ':loop>';

    } else if (tokens[idx] === '#@') {
      tokens[idx] = '<exit:0:return>';

    } else if (tokens[idx] === '?') {
      conditions.push({ condition: jdx, start: idx });

    } else if (tokens[idx] === ':') {

      for (jdx=idx+1, bracketstack=0; jdx<tokens.length; jdx++) {

        if (tokens[jdx] === '[') {
          bracketstack++;
        } else if (tokens[jdx] === ']') {
          bracketstack--;
        }

        if (!bracketstack) {
          if (tokens[jdx].match(/^(;|,|\]|\}|<jmp:.+)$/)) {
            break;
          } else if (tokens[jdx] === '=' && tokens[jdx+1] && tokens[jdx+1].match(/^(;|,|\]|\}|<jmp:.+)$/)) {
            break;
          }
        }
      }

      tokens[idx] = '<jmp:' + jdx + ':then>';
      tokens[conditions.pop().start] = '<jmpz:' + (idx+1) + ':else>';
    }

  }

  return { 'tokens': tokens, 'variables': variables };
}

/**
 * API
 */
module.exports.run = (code) => {
  try {
    return assemble(toPostfix(tokenize(code)));
  } catch (error) {
    return 'Compiler error: ' + error;
  }
}
