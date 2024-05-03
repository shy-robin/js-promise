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

// new MyPromise((resolve) => {
//   resolve(11);
// })
//   .then()
//   .finally(() => {
//     console.log("finally");
//     return new MyPromise((resolve) => {
//       setTimeout(() => {
//         resolve(22);
//       }, 1000);
//     });
//   })
//   .then((res) => {
//     console.log("end", res);
//   });

// const p1 = new MyPromise((resolve) => {
//   setTimeout(() => {
//     resolve(11);
//   }, 1000);
// });
//
// const p2 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject(22);
//   }, 2000);
// });
//
// const p3 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject(33);
//   }, 3000);
// });
//
// MyPromise.all([p1, p2, p3]).then(
//   (res) => {
//     console.log(res);
//   },
//   (reason) => {
//     console.log("reason", reason);
//   }
// );

// const p1 = new MyPromise((resolve) => {
//   setTimeout(() => {
//     resolve(11);
//   }, 5);
// });
// const p2 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject(22);
//   }, 10);
// });
// const p3 = 33;
// const p4 = 44;
//
// MyPromise.race([p1, p2, p4, p3]).then(
//   (res) => {
//     console.log("succeed", res);
//   },
//   (reason) => {
//     console.log("failed", reason);
//   }
// );

// const p1 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve({
//       data: "aaaaa",
//     });
//   }, 1000);
// });
// const p2 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve({
//       data: "bbbbb",
//     });
//   }, 2000);
// });
// const p3 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject("404");
//   }, 1500);
// });
// const p4 = "1111";
//
// MyPromise.allSettled([p1, p2, p3, p4]).then(
//   (value) => {
//     console.log("value", value);
//   },
//   (reason) => {
//     console("reason", reason);
//   }
// );

const p1 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve(11);
  }, 100);
});
const p11 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject(44);
  }, 10);
});
const p2 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject(22);
  }, 50);
});
const p3 = 33;

MyPromise.any([p1, p11, p2]).then(
  (val) => {
    console.log(val);
  },
  (reason) => {
    console.log(reason.message);
  }
);
