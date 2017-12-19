
/**
 * Globals
 */
var
/**
 * Binary operators and some separators, by precedence. Used by postfixer
 * Ternary "?:" kind of works, needs braces for subexp, e.g. "a?(b?c:d):e" instead of "a?b?c:d:e"
 */
binary = {

  functions: {

  '+' : function (left, right, tl, tr) {

     return tl == 'F' && tr == 'F' ? new curry(left, right)
          : tl == 'A' && tr == 'A' ? left.concat(right)
          : tl == 'S' && tr == 'S' ? left.concat(right)
          : tl == 'A' && tr == 'F' ? left.reduce(right)
          //: tl == 'A' ? left.map((e) => _op('infix', '+', e, right))
          //: tl == 'O' && tr == 'O' ? obj_union(left, right)
          : left*1 + right*1 // #+ for matrix sum, ^+ for polyynomial sum
        },

  '-' : function (left, right, tl, tr) {
     return tl == 'A' && tr == 'A' ? array_difference(left, right)
          //: tl == 'A' && tr == 'F' ? left.filter((e)  => !right.call(e)) // reverse filter
          //: tl == 'A' ? left.map((e) => _op('infix', '-', e, right))
          : tl == 'S' ? left.replace(right, '')
          : tl == 'O' ? obj_difference(left, right)
          : left*1 - right*1 // #- for matrix diff, ^- for polynomial diff
        },

  '*' : function (left, right, tl, tr) {
     return tl == 'A' && tr == 'A' ? null // zip
          : tl == 'A' && tr == 'F' ? left.map(right)
          //: tl == 'A' ? left.map((e) => _op('infix', '*', e, right))
          : tl == 'F' && tr == 'F' ? new compose(left, right)
          : tl == 'S' ? left.match(right)
          : tl == 'O' && tr == 'O' ? obj_intersect(left, right)
          : left*1 * right*1
        },

  '/' : function (left, right, tl, tr) { // https://github.com/jcoglan/sylvester
     return tl == 'A' && tr == 'A' ? null // unzip
          : tl == 'A' && tr == 'F' ? left.filter(right)
          //: tl == 'A' ? left.map((e) => _op('infix', '/', e, right))
          : tl == 'S' && tr == 'N' ? left.match(new RegExp('.{1,' + right + '}', 'g'))
          : left*1 / right*1.0 // maybe #/ for matrix div and user array / array for reverse cartesian product, ^/ for polynomial div
        },

  '%' : function (left, right, tl, tr) { // https://github.com/infusion/Polynomial.js/blob/master/polynomial.js
     return tl == 'A' && tr == 'F' ? left.forEach(right)
          //: tl == 'A' ? left.map((e) => _op('infix', '%', e, right))
          : tl == 'O' && tr == 'O' ? null // polynomial derivative or matrix something
          : tl == 'S' && tr == 'A' && right[0].length >= 2 ? left.replace(right[0], right[1])
          : left*1 % right*1
        },

  '**': function (left, right, tl, tr) {
          //  tl == 'A' ? left.map((e) => _op('infix', '**', e, right))
     return Math.pow(left*1, right*1)
        },

  '//': function (left, right, tl, tr) {
     return tl == 'A' ? rotate_array(left, right)
          : tl == 'S' ? rotate_array(left.split(''), right).join('')
          : tl == 'N' && right == 2 ? Math.sqrt(left)
          : Math.pow(left*1, 1 / right)
        },

  '%%': function (left, right, tl, tr) {
     return tl == 'A' ? rotate_array(left, right)
          : tl == 'S' ? rotate_array(left.split(''), right).join('')
          : Math.log(left*1) / Math.log(right*1)
        },

  '#' : function (left, right, tl, tr) {
        },

  '^' : function (left, right, tl, tr) {
        },

  '&&': function (left, right, tl, tr) {
          return left & right
        },

  '&' : function (left, right, tl, tr) {
          return left && right
        },

  '||': function (left, right, tl, tr) {
          return left | right
        },

  '|' : function (left, right, tl, tr) {
          return left || right
        },

  '<' : function (left, right, tl, tr) {
     return tl == 'A' ? null // array contains not equals
          : tl == 'S' ? left != right && right.indexOf(left) > -1
          //: t == 'O' ?
          : left*1 < right*1
        },

  '<=': function (left, right, tl, tr) {
     return tl == 'A' ? null // array contains all
          : tl == 'S' ? right.indexOf(left) > -1
          //: t == 'O' ?
          : left*1 <= right*1
        },

  '>' : function (left, right, tl, tr) {
     return tl == 'A' ? null // array contains not equals
          : tl == 'S' ? left != right && left.indexOf(right) > -1
          //: tl == 'O' ? // object contains not equals
          : left*1 > right*1
        },

  '>=': function (left, right, tl, tr) {
     return tl == 'A' ? null // array contains
          : tl == 'S' ? left.indexOf(right) > -1
          //: tl == 'O' ? // object contains
          : left*1 >= right*1
        },

  '!=': function (left, right, tl, tr) {
          return left != right
        },

  '==': function (left, right, tl, tr) {
          return left == right
        },
  },
  precedence : {
    '[' : 10,
    '{' : 10,
    '(' : 10,
    ',' : 15,
    ';' : 15,
    '=' : 19,
    '.' : 19,
    '*' : 80,
    '**': 80,
    '/' : 80,
    '//': 80,
    '%' : 80,
    '%%': 80,
    '^' : 80,
    '+' : 70,
    '-' : 70,
    '<' : 60,
    '<=': 60,
    '>' : 60,
    '>=': 60,
    '==': 60,
    '!=': 60,
    '&' : 50,
    '|' : 40,
    '?' : 20,
    ':' : 30,
  },
},
/**
 * List of prefixes. All expressions are left-evaluated so precedence is positional
 * Prefixes are always evaluated before any other binary or postfix op
 */
prefixes = {
    '!':1, '~':1, '-':1,
},
/**
 * List of suffixes. All expressions are left-evaluated so precedence is positional
 * Suffixes are evaluated after prefixes, but before any binary op
 */
suffixes = {
    '++':1, '--':1, '$$':1, '$':1, '@@':1, '>>':1, '<<':1, '..':1, '^^':1
};

/**
 * Nested peek: returns last elem of array, optionally enters nested structure, e.g. [1,[2,[3]]].peek(1) == [3]
 * No argument or zero defaults to Array.prototype.peek(), negative returns this
 */
Array.prototype.peek = function (level) {
    level = level || 0;
    return level < 0 ? this
      : level == 0 ? this[this.length-1]
      : this[this.length-1].peek(level-1);
}

/**
 * Nested unshift: finds first elem of array and appends the current value in front to it, entering n levels of nested structures
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
 * Converts all infix ops to postfix (RPN), since that's easier to compute
 * Uses an extended Shunting-yard algorithm, recognizing "," as expression separator,
 *   recognizes [] and {} as expression groups and retains them for arrays and objects
 */
function toPostfix (expression) {

    var stack = [],
    output = [],
    brackets = {
        open : {'(':')', '[':']', '{':'}'},
        close: {')':'(', ']':'[', '}':'{'},
    },
    idx, char, br, brstack = [];

    for (idx = 0; idx < expression.length; idx++) {

        char = expression[idx];
        if (char === undefined) {
            continue;
        }

        if (brackets['open'][char]) {
            brstack.push(brackets['open'][char]);

            if (char == '[' || char == '{') {
                output.push(char);
            }
        }

        br = brackets['close'][brstack.peek()];

        if (char == brstack.peek()) {
            while (stack.peek() != br) {
                output.push(stack.pop());
            }
            stack.pop();
            brstack.pop();

            if (char == ']' || char == '}') {
                output.push(char);
            }

        } else {

            while (!brackets['open'][char] && stack.length
              && ((binary['precedence'][stack.peek()]||100) >= (binary['precedence'][char]||100))) {
                output.push(stack.pop());
            }

            if ([',',';'].indexOf(char) == -1) {
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
 * Prepares expression for converting to postfix:
 *   Groups string literals to single token
 *   Groups two-character postfixes and prefixes to single token
 *   Replaces unary minus with n-dash so it doesn't confuse the postfixer
 */
function tokenize (expression) {
    var tokens = expression.split(''),
        grouped = {
            '*' : {'*':1},
            '+' : {'+':1},
            '-' : {'-':1},
            '@' : {'@':1},
            '$' : {'$':1},
            '+' : {'+':1},
            '-' : {'-':1},
            '<' : {'<':1, '=':1},
            '>' : {'>':1, '=':1},
            '=' : {'=':1, '>':1},
        },
        opening = { '(':1, '[':1, ',':1, ';':1 },
        closing = { ')':1, ']':1, ',':1, ';':1 },
        idx, group, concat, esc, num, last;

    for (idx=0, esc=0, concat=-1; idx<tokens.length; idx++) { // first group strings so we don't have to check if anything is unquoted
        if (tokens[idx] == '\\') {
            esc++;
        } else {
            if (tokens[idx] == '"' && !(esc%2)) {
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

    tokens = tokens.filter(function(e) { // replace empty tokens and whitespace
        return e != undefined && e != ' ' && e != '\n' && e != '\t';
    });

    for (idx=1, concat=0, last=0; idx<tokens.length; idx++, concat=0) { // replace prefixes with binary ops, group numeric digits and multi-char infix operators

        group = grouped[tokens[idx]];

        if (tokens[idx-1] == '-') { // replace prefix - with -1*, so we can evaluate it as a binary op
            if (idx==2 || (idx<tokens.length-1 && (binary['precedence'][tokens[idx-2]] || opening[tokens[idx-2]]))) {
                tokens.splice(idx-1, 1, '-1', '*');
                idx+=2;
            }

        } else if (tokens[idx-1] == '!') { // replace ! with conjuction with false, so we can evaluate it as a binary op
            tokens.splice(idx-1, 1, 'F', '&');
            idx++;

        } else if (tokens[idx-1] == '~') { // replace ~ with false~ so we can evaluate it as a binary op
            tokens.splice(idx-1, 1, 'F', '~');
            idx++;

        } else if (group && group[tokens[idx-1]]) {
            tokens[idx-1] += tokens[idx];
            tokens[idx] = undefined;

        } else if (!isNaN(parseFloat(tokens[idx-1]))) {

            for (concat=0; idx < tokens.length; idx++, concat++) {
                if (isNaN(parseFloat(tokens[idx]))) {
                    break;
                }

                tokens[idx-1-concat] = String.prototype.concat.call(tokens[idx-1-concat], tokens[idx]);
                tokens[idx] = undefined;
            }
        }
    }

    for (idx=1; idx<tokens.length - 4; idx++) { // loop conditions with a single variable need to be evaluated
        if (tokens[idx-1]=='(' && tokens[idx+1]==')' && tokens[idx+2]=='{') {
            tokens.splice(idx, 0, 'T', '&');
            idx++;
        }
    }

    return tokens.filter(function(e) {
        return e != undefined;
    });
}

/**
 * Checks if token on given position is unescaped by backslash
 * This check is short, 1 loop iteration per backslash *immediately* preceeding the given position
 */
function unescaped(tokens, idx) {
    var count;
    for (count = 0; idx>0;) {
        if (tokens[--idx] != '\\') break;
        count++;
    }
    return !(count%2);
}

function resolveOperand(variables, stack, options) {
    var brackets = [], entity = [], operand, peek = stack.peek();
    options = options || {};

    if (peek == ']') {

        for (; stack.length ; ) {
            peek = stack.peek();

            if (peek == '[') { // peek
                stack.pop();
                brackets.pop();

            } else if (peek == ']') {
                entity.nunshift([], brackets.length);
                brackets.push(stack.pop());
                continue;
            }

            if (!brackets.length) { // validate here that brackets match?
                operand = entity[0];
                break;

            } else if (stack.peek() != ']') {
                entity.nunshift(stack.pop(), brackets.length);
            }

        }

    } else {
        operand = stack.pop();

        if (String.prototype.match.call(operand, /^".*"$/)) {
            operand = operand.slice(1,-1);

        } else if (!isNaN(parseFloat(operand))) {
            operand = parseFloat(operand);

        } else if (String.prototype.match.call(operand, /^[a-z]+(\.([a-z]+|[0-9]+))*$/)) {

            if (!options.skipAccessor) {
                operand = variables[operand] || operand;
            }
        }
    }

    return operand;
}

Number.prototype.__resolved = true;

Object.prototype.nestedSet = function (keys, value) {
    var key = Array.isArray(keys) ? keys.shift() : keys;

    if (keys.length) {
        this[key].nestedSet(keys, value);

    } else {
        if (Array.isArray(this)) {
            for(var idx=key-1; this[idx]===undefined; idx--) {
                this[idx] = null;
            }
        }
        this[key] = value;
    }
}

/**
 * Runs the code, returning the state (assigned variables) and results (non-assigned expression evaluations ordered chronologically)
 * Tracks resolved tokens (unfortunately we need to do this since variable/member assignment is a bit more complicated than RPN calculation)
 */
function interpret(tokens) {

    var variables = {}, stack = [], results = [], assign = 0, later = null, timeout = 0,
        instruction, value, op1, op2, idx, jdx, kdx;

    for (idx=0; idx<tokens.length+1; idx++, timeout++) {

        if (timeout >= 100000) { // timeout after 100k instructions
            variables = null;
            results = 'Timeout';
            break;

        } else if (idx > assign) { // keep track of var assignment, so we can handle e.g. a.3 = 2 versus b = a.3

            for(jdx=idx, assign=0; jdx<tokens.length; jdx++) {
                if (tokens[jdx] == ',' || tokens[jdx] == ';' || tokens[jdx] == '{') {
                    break;
                } else if (tokens[jdx] == '=') {
                    assign = jdx;
                    break;
                }
            }
        }

        if (idx == tokens.length || tokens[idx] == ',' || tokens[idx] == ';') { // expression delimiters

            if (tokens[idx] == ',') {
                continue;

            } else { // an expression has been evaluated
                results = results.concat(stack);
                stack = [];
            }

        } else if (tokens[idx] === undefined) {
            continue;

        } else if (instruction = tokens[idx].match(/^<(.+):(.+)>$/)) { // instructions

            if (instruction[1] == 'jmpz') {
                if (!stack.peek()) {
                    idx = instruction[2];
                } else {
                    continue;
                }

            } else if (instruction[1] == 'jmp') {
                idx = instruction[2];
            }

        } else if (binary['precedence'][tokens[idx]] > 15) { // brackets have precedence 10 and comma has 15

            op2 = stack.peek().__resolved ? stack.pop() : resolveOperand(variables, stack);
            op1 = stack.peek().__resolved ? stack.pop() : resolveOperand(variables, stack, {skipAccessor: idx>=assign});

            if (tokens[idx] == '=') {
                if (Array.isArray(op1)) {
                    variables.nestedSet(op1, op2);
                } else {
                    variables[op1] = op2;
                }

            } else {
                value = evaluate('bin', tokens[idx], op1, op2, {skipAccessor: idx>=assign});

                op1.__resolved = true;
                op2.__resolved = true;
                value.__resolved = true;

                stack.push(value);
            }

        } else if (suffixes[tokens[idx]]) {
            op1 = resolveOperand(variables, stack);
            stack.push(evaluate('suf', tokens[idx], op1, undefined, {skipAccessor: idx>=assign}));

        } else {
            stack.push(tokens[idx]);
        }
    }

    return JSON.stringify({ state: variables, return: results });
}

function evaluate(position, operator, op1, op2, options) {
    options = options || {};
    var tl, tr;

    function type(op) {
        return Array.isArray(op) ? 'A' // array
        : typeof op == 'object' ? 'O' // object
        : typeof op == 'string' && op[0] == '"' ? 'S' // string (this check always needs to be before "number")
        : !isNaN(parseFloat(op)) ? 'N' // number
        : op != null && op != undefined ? 'V'
        : undefined;
    }

    function cast(op, typ) {
        if (typ == 'S') return op.slice(1,-1);
        if (typ == 'N') return parseFloat(op);
        if (typ == 'A') return op.map(function(e) { return cast(e, type(e)); })
        if (!typ) {
            if (op == 'T') return true;
            if (op == 'F') return false;
            if (op == 'N') return null;
        }
        return op;
    }

    tl = type(op1);
    tr = type(op2);

    op1 = cast(op1, tl);
    op2 = cast(op2, tr);

    if (position == 'bin') {
        if (operator == '.') {
            if (options.skipAccessor) {
                return [op1, op2];
            }
            return op1[op2];
        }

        return binary['functions'][operator].call(null, op1, op2, tl, tr);

    } else if (position == 'suf') {

    }

    return null;
}

function setJumps(tokens) {
    var idx, jdx, loops = [];
    for (idx=0, jdx=0; idx<tokens.length; idx++) {
        if (tokens[idx] == ';') {
            jdx = idx;
        } else if (tokens[idx] == '{') {
            loops.push({ condition: jdx, start: idx });
        } else if (tokens[idx] == '}') {
            tokens[idx] = '<jmp:' + loops.peek().condition + '>';
            tokens[loops.pop().start] = '<jmpz:' + (idx+1) + '>';
        }

    }
    return tokens;
}

// todo:
// 1. if then else (somehow distinguish from loop)
// 2. continue and break as jumps
// 3.

//console.log(unescaped(['b','=','"','"',';','b','=','"','a','a','a',' ','\\','"','b',' ','c',], 14))
//console.log((setJumps(toPostfix(tokenize('b=5;b=b-1;-b;')))))
//console.log((((tokenize('b="";b="aaa \\"b d";c=3;')))))
//console.log(interpret(setJumps(toPostfix(tokenize('b=6;c= 10;(b>2){c=-c+1;b=b-1;};')))))
//console.log((setJumps(toPostfix(tokenize('b=6;c=10;(b){c=c+1;b=b-1;};')))))
//console.log((setJumps(toPostfix(tokenize('b=6;(b<0){b=[];z=0;(b-1){c=3;}};')))))
//console.log(interpret(toPostfix(tokenize('a=[2]+[6];b=6;(b+1){b=[];z=0;};a.(2-1)=3;c=3;a.c=7'))))
//console.log(interpret(toPostfix(tokenize('a=[1]+[6];b=[];a.1=5;'))))
//console.log(interpret(toPostfix(tokenize('a=1+2+3;[1+1,[2+1,["A"]],["B",4+1]]+[6]'))))
//console.log(JSON.stringify(interpret(toPostfix(tokenize('[1+1,[2+1,["A"]],["B",4+1]]+[6]'))).results))
//console.log(interpret(toPostfix(tokenize('[1,2,["A","B",4]]+[1,2]'))))
//console.log(interpret(toPostfix(tokenize('[1,2,["A"+"B",4]]+[1,2]'))))
//console.log(interpret(toPostfix(tokenize('[1,2,3+4]+[1,2,3]'))))
//console.log(interpret(toPostfix(tokenize('["A","B","C","D"]*1'))))
//console.log(interpret(toPostfix(tokenize('7+0*[-1,"23A",(3000+5)*2]'))));


// https://github.com/zloirock/core-js


/*
    (?<=[\[\(;]\s*)@ => return
    @+ => continue
    @- => break
    T  => true
    F  => false
    N  => null
*/
