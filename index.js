const Promise = require('./PromiseAPlus');
const p = Promise.resolve(); p.then(() => console.log('1')).then(() => console.log('3')); p.then(() => console.log('2'));
