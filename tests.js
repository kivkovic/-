'use strict';

const
  compiler = require('./compiler').run,
  interpreter = require('./interpreter').run,

  tests = [
{
  code: '1>2?3:4<5?7<8?1*(2+3/5)-(1+2*(2+3*(3+4%2)))/2:0:6',
  description: 'Binary, ternary and bracket precedence check',
  expected: -8.9,
},
{
  code: 'b=[1,[2,2,[3,3,3,[4,4,4,4]]]]; b.0=0; b.1.0=8; b.1.2.3.0="A"; b;',
  description: 'Initialize nested array and update inner elements on all levels',
  expected: [0,[8,2,[3,3,3,['"A"',4,4,4]]]],
},
{
  code: 'a=10;b=11;d.["a","b"]={a=a+1;b=b+3;a-b;#@;}; z=d.[5,6]+a+b',
  description: 'Function definition, scope and call',
  expected: 18,
},
{
  code: 'n=13; d=1; m=n/2; (d<m){ d=d+1; n%d ? #$ : #! }; d>m',
  description: 'Simple prime check on integer n by trial division up to n/2',
  expected: true,
},
{
  code: 'a=[4,5,3,1,2]; i=0; j=0; (i<a$){ j=0; (j<a$){ t=a.i; a.i<a.j ? a.i=a.j, a.j=t : 0; j=j+1; }; i=i+1 ; }; a',
  description: 'Naive n^2 exchange sort on an array of integers',
  expected: [1, 2, 3, 4, 5],
},
{
  code: 'b="10"+"11"; r=[["x0","0xx"],["1","0x"],["0",""]]; i=-1;j=-1; (1){ i=(i+1)%r$; b@r.i.0$ ? b=b@r.i, i=-1 : 0; i>=r$-1 ? #! : #$; }; b@["x",1]',
  description: 'Interprets a Markov algorithm ruleset thaT converts a string representation of a binary number to unary',
  expected: '"11111111111"',
},
{
  code: 'g.["a","b"]={c=b>0?_.[b,a%b]:a;#@}; c=g.[2310,1430]',
  description: 'Euclidean greatest common divisor algorithm (recursive)',
  expected: 110,
}
];

let start = +new Date, ok = 0, failed = 0, errors = 0;

console.log('=================== Running tests ===================\n');

for (let i=0, returns; i<tests.length; i++) {
  try {
    if (JSON.stringify(returns = interpreter(compiler(tests[i].code)).return) == JSON.stringify(tests[i].expected)) {
      console.log('✓ OK     ' + tests[i].description);
      ok++;
    } else {
      console.log('✗ FAIL   ' + tests[i].description + ' -- expected: ' + tests[i].expected + ', got: ' + returns);
      failed++;
    }
  } catch (error) {
    console.log('✗ ERROR  ' + tests[i].description + ' -- exception: ' + error);
    errors++;
  }
}

console.log('\n---------------------- Results ----------------------');
console.log('Passed  ' + ok     + '/' + tests.length + ' ' + (ok == tests.length ? '✓' : '✗'));
console.log('Failed  ' + failed + '/' + tests.length + ' ' + (failed == 0 ? '✓' : '✗'));
console.log('Errors  ' + errors + '/' + tests.length + ' ' + (errors == 0 ? '✓' : '✗'));
console.log('-----------------------------------------------------');
console.log('Total of ' + tests.length + ' tests executed in ' + (+new Date - start) + ' ms');
