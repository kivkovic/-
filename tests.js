'use strict';

module.exports.run = (compiler, runner, logger) => {
  let 
    time = () => new Date().getTime(),
    tests = [
  {
    code: 'b=[1,[2,2,[3,3,3,[4,4,4,4]]]]; b.0=0; b.1.0=8; b.1.2.3.0="A"; T&b',
    description: 'Initialize nested array and set inner elements on all levels',
    expected: [0,[8,2,[3,3,3,["A",4,4,4]]]],
  },
  {
    code: 'd.["a","b"]={a=a+1;b=b+3;a-b;#@;}; z=d.[5,6]; T&z',
    description: 'Function definition and function call',
    expected: -3,
  },
  {
    code: 'n=13; d=1; m=n/2; (d<m){ d=d+1; n%d ? #$ : #! }; d>m',
    description: 'Simple prime check on integer n by trial division up to n/2',
    expected: true,
  },
  {
    code: 'a=[4,5,3,1,2]; i=0; j=0; (i<a$){ j=0; (j<a$){ t=a.i; a.i<a.j ? a.i=a.j, a.j=t : 0; j=j+1; }; i=i+1 ; }; T&a',
    description: 'Naive exchange sort on an array of integers',
    expected: [1, 2, 3, 4, 5],
  },
  {
    code: 'b="101"+"1";r=[["x0","0xx"],["1","0x"],["0",""]]; i=-1;j=-1; (1){ i=(i+1)%r$; b@r.i.0$ ? b=b@r.i, i=-1 : 0; i>=r$-1 ? #! : #$; };b@["x",1]',
    description: 'Interpret Markov algorithm ruleset to convert string representing binary to unary',
    expected: '"11111111111"',
  },
  {
    code: 'g.["a","b"]={b>0?c=_.[b,a%b]:c=a;T&c;#@};c=g.[2*3*5*7*11,2*5*11*13];T&c;',
    description: 'Euclidean greatest common divisor algorithm (recursive)',
    expected: 2*5*11,
  }
  ];

  let start = time(),
      ok=0, failed=0, errors=0;
      
  logger('=================== Running tests ===================\n');
  for (let i=0, returns; i<tests.length; i++) {
    try {
      if (JSON.stringify(returns = runner(compiler(tests[i].code)).return) == JSON.stringify(tests[i].expected)) {
        logger('✓ OK     ' + tests[i].description);
        ok++;
      } else {
        logger('✗ FAIL   ' + tests[i].description + ' -- expected: ' + tests[i].expected + ', got: ' + returns);
        failed++;
      }
    } catch (error) {
      logger('✗ ERROR  ' + tests[i].description + ' -- exception: ' + error);
      errors++;
    }
  }
  logger('\n---------------------- Results ----------------------');
  logger('Passed  ' + ok     + '/' + tests.length + ' ' + (ok == tests.length ? '✓' : '✗'));
  logger('Failed  ' + failed + '/' + tests.length + ' ' + (failed == 0 ? '✓' : '✗'));
  logger('Errors  ' + errors + '/' + tests.length + ' ' + (errors == 0 ? '✓' : '✗'));
  logger('-----------------------------------------------------');
  logger('Total of ' + tests.length + ' tests executed in ' + (time() - start) + ' ms');
}
