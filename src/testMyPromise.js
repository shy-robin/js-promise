const MyPromise = require("./MyPromise");

// [1] executor 不是函数
// new MyPromise(null).then(
//   (res) => console.log(res),
//   (reason) => console.log(reason.message)
// );

// [2] 执行 executor 发生错误
// new MyPromise((resolve, reject, test) => {
//   test();
// }).then(
//   (res) => console.log(res),
//   (reason) => console.log(reason.message)
// );

// [3] 在 executor 同步执行 resolve
// new MyPromise((resolve, reject) => {
//   resolve(111);
// }).then(
//   (res) => {
//     console.log(res);
//   },
//   (reason) => {
//     console.log(reason);
//   }
// );

// [4] 在 executor 同步执行 reject
// new MyPromise((resolve, reject) => {
//   reject("failed");
// }).then(
//   (res) => {
//     console.log(res);
//   },
//   (reason) => {
//     console.log(reason);
//   }
// );

// [5] 如果 onFulfilled 不是函数，则透传 value
// new MyPromise((resolve, reject) => {
//   resolve(111);
// })
//   .then(null, (reason) => {
//     console.log(reason);
//   })
//   .then((res) => console.log(res));

// [6] 如果 onRejected 不是函数，则透传 reason
// new MyPromise((resolve, reject) => {
//   reject("failed");
// })
//   .then((res) => console.log(res), null)
//   .then(
//     (res) => console.log(res),
//     (reason) => console.log(reason)
//   );

// [7] 循环引用
// const p = new MyPromise((resolve) => {
//   resolve(1);
// }).then(() => {
//   return p;
// });
// // 抛出错误
// p.then(null, (reason) => console.log(reason));

// [8] 异步处理回调队列
// new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve(123);
//   }, 1000);
// }).then((res) => console.log(res));

// new Promise((resolve, reject) => {
//   resolve(1);
// })
//   .then((res) => {
//     return new Promise((resolve, reject) => {
//       setTimeout(() => {
//         resolve(2);
//       }, 1000);
//     })
//       .then()
//       .then((res) => {
//         return new Promise((resolve) => {
//           resolve(3);
//         });
//       });
//   })
//   .then((res) => console.log(res));

// called 作用
// const thenable1 = {
//   then(onFulfilled) {
//     setTimeout(() => {
//       onFulfilled(1);
//     }, 0);
//   },
// };
// const thenable2 = {
//   then(onFulfilled) {
//     onFulfilled(thenable1);
//     onFulfilled(2);
//   },
// };
//
// new MyPromise((resolve, reject) => {
//   resolve();
// })
//   .then((res) => {
//     return thenable2;
//   })
//   .then((res) => console.log(res));

// MyPromise.reject("failed").then(
//   (res) => {
//     console.log(res);
//   },
//   (reason) => {
//     console.log(reason);
//   }
// );

// MyPromise.reject("failed").catch((err) => {
//   console.log(err);
// });
