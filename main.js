/*
∞
*/

'use strict';

var compiler    = require('./compiler'),
	interpreter = require('./interpreter'),
	tests       = require('./tests');

tests.run(compiler.run, interpreter.run, console.log);

//function isprime(n){ for(d=2;d<Math.sqrt(n)+1;d++){ if (!(n%d)) return 0; }; return 1; }

//function randprime(m) { m=m||1e6; for(p=2;!isprime(p);p=~~(Math.random()*(m-2))+2); return p; }

console.log(interpreter.run(compiler.run(
	'"A"+"3"'
)))

// todo
// ---1. remove T&... logic, force stack to eval on next , or ;
// ---1.1. implement force eval on any binary or ternary op -- resolve operand if variable! allows x?...:...
// ---2. force ternary eval to stack and make sure everything else evals to stack
// 3. make ; and , interchangeable (if this makes sense? probably does) -- only needs : safety
// 4. finish operators
// 5. make decent string detector
// --- 6. maybe wrap functions and loops into [] instead of {}? -- this would complicate function detection in parsing
//   6.1. array bracketed expressions are kind of broken now?, fix
// 7. 