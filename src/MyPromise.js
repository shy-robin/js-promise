class MyPromise {
  /**
   * 等待态
   */
  static PENDING = "pending";
  /**
   * 成功态
   */
  static FULFILLED = "fulfilled";
  /**
   * 失败态
   */
  static REJECTED = "rejected";

  /**
   * 【私有变量】promise 的状态，初始为 pending
   */
  #status = MyPromise.PENDING;
  /**
   * 【私有变量】promise 转为成功态后传递的值
   */
  #value = null;
  /**
   * 【私有变量】promise 转为失败态后传递的值
   */
  #reason = null;
  /**
   * 【私有变量】
   */
  #resolveCallbacks = [];
  /**
   * 【私有变量】
   */
  #rejectCallbacks = [];

  constructor(executor) {
    /**
     * 【发布通知】调用 resolve 后立即将 promise 转为成功态并记录传递的 value
     */
    const resolve = (value) => {
      // Promises/A+ 并没有规定 resolve(promise)，这里是为了和 ES6 保持表现一致
      if (value instanceof MyPromise) {
        return value.then(resolve, reject);
      }
      if (this.#status === MyPromise.PENDING) {
        this.#status = MyPromise.FULFILLED;
        this.#value = value;
        // 当同步调用 resolve 时，#resolveCallbacks 为空
        // 主要是为了异步处理回调队列
        // [8]
        this.#resolveCallbacks.forEach((callback) => {
          callback();
        });
      }
    };

    /**
     * 【发布通知】调用 reject 后立即将 promise 转为失败态并记录传递的 reason
     */
    const reject = (reason) => {
      if (this.#status === MyPromise.PENDING) {
        this.#status = MyPromise.REJECTED;
        this.#reason = reason;
        this.#rejectCallbacks.forEach((callback) => {
          callback();
        });
      }
    };

    try {
      // 同步执行传入的 executor
      executor(resolve, reject);
    } catch (err) {
      // 如果 executor 不是函数或者执行 executor 时发生错误，将错误交给 reject 处理
      // [1] [2]
      reject(err);
    }
  }

  /**
   * 【收集订阅】收集成功态和失败态的回调函数
   * 会返回一个新的 promise 对象，可以继续链式调用
   */
  then(onFulfilled, onRejected) {
    // onFulfilled 应当是函数，接收成功的 value，如果不是函数，则将其转换为函数，
    // 用于透传 value，交给下一个 onFulfilled 处理
    // [5]
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    // onRejected 应当是函数，接收失败的 reason，如果不是函数，则将其转换为函数，
    // 用于透传错误 reason，交给下一个 onRejected 处理
    // [6]
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (err) => {
            throw err;
          };

    /**
     * 处理 onFulfilled 或 onRejected 回调的返回值
     */
    const resolvePromise = (x, promise2, resolve, reject) => {
      // 处理循环引用（返回值是本身 promise）
      // [7]
      if (x === promise2) {
        return reject(
          new TypeError("Chaining cycle detected for promise #<Promise>")
        );
      }

      // 如果返回值是 promise 对象，即是一个 thenable 的对象
      // 根据 Promises/A+ 规范(https://promisesaplus.com/)
      // 如果一个变量是对象或者函数并且有 then 方法，则视为一个 promise 对象
      if (x && (typeof x === "object" || typeof x === "function")) {
        // 解决 promise 对象中实现的 then 方法可能重复调用 resolve 或 reject
        // 如果不加 called 进行条件过滤，会使得这些重复调用以最后一次调用作为结果
        // 根据 Promises/A+ 规范，应当以第一次调用作为结果，所以需要加上 called 过滤
        let called = false;
        try {
          // 确保在调用 then 方法时使用的是最初的引用,
          // 而不会受到后续对 x 的修改或访问器属性的影响
          const then = x.then;
          if (typeof then === "function") {
            // 将 then 中的 this 绑定到 x
            then.call(
              x,
              (value) => {
                if (called) return;
                called = true;
                // 存在依然返回 promise 对象的情况，因此需要做递归处理
                resolvePromise(value, promise2, resolve, reject);
              },
              (reason) => {
                if (called) return;
                called = true;
                // 如果失败，交给下一个 then 处理
                reject(reason);
              }
            );
          } else {
            // 如果 then 不是函数，直接将其 resolve
            resolve(x);
          }
        } catch (err) {
          if (called) return;
          called = true;
          // 调用 then 可能出错，需要捕获异常
          reject(err);
        }
      } else {
        // 如果返回值不是 promise 对象，直接将其 resolve
        resolve(x);
      }
    };

    // then() 返回支持链式调用
    // 这里的 resolve 和 reject
    const promise2 = new MyPromise((resolve, reject) => {
      switch (this.#status) {
        case MyPromise.PENDING:
          // 采用发布订阅的模式
          // 【订阅】如果状态时 Pending，则先收集所有回调函数
          // 【通知】当状态改变时（执行 resolve 或 reject 后），执行这些回调
          this.#resolveCallbacks.push(() => {
            // 这里使用 setTimeout 是因为在 promise2 初始化之前调用了 promise2，
            // 为了防止报错，用 setTimeout 异步执行这段代码
            queueMicrotask(() => {
              try {
                const x = onFulfilled(this.#value);
                resolvePromise(x, promise2, resolve, reject);
              } catch (err) {
                reject(err);
              }
            });
          });
          this.#rejectCallbacks.push(() => {
            // 这里使用 setTimeout 是因为在 promise2 初始化之前调用了 promise2，
            // 为了防止报错，用 setTimeout 异步执行这段代码
            queueMicrotask(() => {
              try {
                const x = onRejected(this.#reason);
                resolvePromise(x, promise2, resolve, reject);
              } catch (err) {
                reject(err);
              }
            });
          });
          break;
        // 如果 promise 为成功态，说明 executor 同步执行了 resolve 函数
        // [3]
        case MyPromise.FULFILLED:
          // 这里使用 setTimeout 是因为在 promise2 初始化之前调用了 promise2，
          // 为了防止报错，用 setTimeout 异步执行这段代码
          queueMicrotask(() => {
            try {
              // 成功回调会有返回值，有以下情况：
              // 1. 无返回hi在
              //
              const x = onFulfilled(this.#value);
              resolvePromise(x, promise2, resolve, reject);
            } catch (err) {
              reject(err);
            }
          });
          break;
        // 如果 promise 为失败态，说明 executor 同步执行了 reject 函数
        // [4]
        case MyPromise.REJECTED:
          // 这里使用 setTimeout 是因为在 promise2 初始化之前调用了 promise2，
          // 为了防止报错，用 setTimeout 异步执行这段代码
          queueMicrotask(() => {
            try {
              const x = onRejected(this.#reason);
              resolvePromise(x, promise2, resolve, reject);
            } catch (err) {
              // 捕获透传的 reason
              // [6]
              reject(err);
            }
          });
          break;
      }
    });

    return promise2;
  }

  static resolve(value) {
    return new MyPromise((resolve) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new Promise((_resolve, reject) => {
      reject(reason);
    });
  }
}

// promises-aplus-tests
MyPromise.deferred = function () {
  const deferred = {};
  deferred.promise = new MyPromise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

// const promisesAPlusTests = require("promises-aplus-tests");
//
// promisesAPlusTests(MyPromise, (err) => {
//   if (err) {
//     console.log("测试用例执行失败", err);
//   } else {
//     console.log("测试用例执行成功");
//   }
// });

module.exports = MyPromise;
