import TypeCheck, { isString } from './utils/type-check.util';

console.log(isString('test'));
console.log('Default export test:', TypeCheck.isString('test'));
