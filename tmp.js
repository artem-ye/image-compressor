const obj = { a: 1, b: 2, c: 33 };

const obj2 = 'a,b'.split(',').reduce((acc, k) => {
  const v = obj[k];
  return v ? { ...acc, k: v } : acc;
}, {});

console.log(obj2);
// for (const k of 'a,b'.split(',')) {
//   console.log(k);
// }
