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
   * 【私有变量】成功回调队列，存储多个 onFulfilled 回调函数
   */
  #resolveCallbacks = [];
  /**
   * 【私有变量】失败回调队列，存储多个 onRejected 回调函数
   */
  #rejectCallbacks = [];

  constructor(executor) {
    /**
     * 调用 resolve 后立即将 promise 转为成功态并记录传递的 value
     */
    const resolve = (value) => {
      if (this.#status === MyPromise.PENDING) {
        this.#status = MyPromise.FULFILLED;
        this.#value = value;
        // 当同步调用 resolve 时，#resolveCallbacks 为空
        // 主要是为了异步处理成功回调队列
        this.#resolveCallbacks.forEach((callback) => {
          callback();
        });
      }
    };

    /**
     * 调用 reject 后立即将 promise 转为失败态并记录传递的 reason
     */
    const reject = (reason) => {
      if (this.#status === MyPromise.PENDING) {
        this.#status = MyPromise.REJECTED;
        this.#reason = reason;
        // 当同步调用 reject 时，#rejectCallbacks 为空
        // 主要是为了异步处理失败回调队列
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
      reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    // onFulfilled 应当是函数，接收成功的 value，如果不是函数，则将其转换为函数，
    // 用于透传 value，交给下一个 onFulfilled 处理
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    // onRejected 应当是函数，接收失败的 reason，如果不是函数，则将其转换为函数，
    // 用于透传错误 reason，交给下一个 onRejected 处理
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (err) => {
            throw err;
          };

    /**
     * 处理 onFulfilled 和 onRejected 回调函数的返回值
     */
    const resolveReturnValue = (x, promise2, resolve, reject) => {
      // 处理链式循环引用问题（返回的 Promise 对象是上一个 Promise）
      if (x === promise2) {
        return reject(
          new TypeError("Chaining cycle detected for promise #<Promise>")
        );
      }

      // 处理 Promise 对象
      // 如果一个变量是对象或者函数并且有 then 方法，则视为一个 promise 对象
      if (x && (typeof x === "object" || typeof x === "function")) {
        // 解决 promise 对象中实现的 then 方法可能重复调用 resolve 或 reject
        // 如果不加 called 进行条件过滤，会使得这些重复调用可能以最后一次调用作为结果
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
                // 如果回调函数已经调用过，则不再执行后续回调
                if (called) return;
                called = true;
                // 如果成功，递归调用（处理仍然返回 Promise 对象的情况）
                resolveReturnValue(value, promise2, resolve, reject);
              },
              (reason) => {
                // 如果回调函数已经调用过，则不再执行后续回调
                if (called) return;
                called = true;
                // 如果失败，转为失败态
                reject(reason);
              }
            );
          } else {
            // 此时没有 then 方法，所以肯定不会执行回调函数，所以不考虑多次调用的情况，因此不加 called 过滤
            // 处理普通值（是对象或者函数，但没有 then 方法）
            resolve(x);
          }
        } catch (err) {
          // 如果回调函数已经调用过，则不再执行后续回调（回调函数执行过程可能出错走到这里）
          if (called) return;
          called = true;
          // 调用 then 方法可能出错，需要捕获异常
          reject(err);
        }
      } else {
        // 处理普通值
        resolve(x);
      }
    };

    const promise2 = new MyPromise((resolve, reject) => {
      switch (this.#status) {
        case MyPromise.PENDING:
          this.#resolveCallbacks.push(() => {
            // 注意，这里使用 setTimeout 是为了在 promise2 初始化之后引用 promise2，不然会报错
            //（因为 setTimeout 的回调函数在同步代码执行完后执行）
            queueMicrotask(() => {
              // 执行回调函数时可能出错，所以需要捕获错误
              try {
                const x = onFulfilled(this.#value);
                resolveReturnValue(x, promise2, resolve, reject);
              } catch (err) {
                reject(err);
              }
            });
          });
          this.#rejectCallbacks.push(() => {
            queueMicrotask(() => {
              try {
                const x = onRejected(this.#reason);
                resolveReturnValue(x, promise2, resolve, reject);
              } catch (err) {
                reject(err);
              }
            });
          });
          break;
        case MyPromise.FULFILLED:
          queueMicrotask(() => {
            try {
              const x = onFulfilled(this.#value);
              resolveReturnValue(x, promise2, resolve, reject);
            } catch (err) {
              reject(err);
            }
          });
          break;
        case MyPromise.REJECTED:
          queueMicrotask(() => {
            try {
              const x = onRejected(this.#reason);
              resolveReturnValue(x, promise2, resolve, reject);
            } catch (err) {
              reject(err);
            }
          });
          break;
      }
    });

    return promise2;
  }

  /**
   * 用于指定发生错误时的回调函数
   */
  catch(onRejected) {
    return this.then(null, onRejected);
  }

  /**
   * 无论成功或失败都会调用，无法获取到成功的 value 和失败的 reason
   * 返回一个 promise 对象，透传上一次的 value 或 reason
   */
  finally(fn) {
    // 收集成功和失败回调
    return this.then(
      (value) => {
        // 执行 fn 并透传上一次的成功 value
        return MyPromise.resolve(fn()).then(() => value);
      },
      (reason) => {
        // 执行 fn 并透传上一次的失败 reason
        return MyPromise.resolve(fn()).then(() => {
          throw reason;
        });
      }
    );
  }

  /**
   * 将一个对象（可能是 Promise，也可能是 thenable 对象，也可能是其他）转为 Promise 对象
   */
  static resolve(value) {
    if (value instanceof MyPromise) {
      return value;
    }
    return new MyPromise((resolve) => {
      resolve(value);
    });
  }

  /**
   * Promise.reject() 方法的参数，会原封不动地作为 reject 的理由，变成后续方法的参数。
   */
  static reject(reason) {
    return new Promise((_resolve, reject) => {
      reject(reason);
    });
  }

  /**
   * 将多个 promise 放在一个数组中，
   * 当整个数组的全部 promise 成功时才会返回成功（返回的是所有成功结果的数组），
   * 当数组中的 promise 有一个出现失败时就返回失败 (失败的原因是第一个失败promise的结果)。
   * 返回的是一个promise
   */
  static all(promises) {
    // 判断传入的参数是否可迭代
    MyPromise.#isIterator(promises);

    return new MyPromise((resolve, reject) => {
      const result = [];
      let times = 0;

      const processSuccess = (value, index) => {
        result[index] = value;

        // 全部执行成功后，返回数组
        if (++times === promises.length) {
          resolve(result);
        }
      };

      for (let i = 0; i < promises.length; i++) {
        const p = promises[i];
        if (p && typeof p.then === "function") {
          // 如果是 promises，则收集回调，成功则存入数组，失败则直接 reject
          p.then(
            (res) => {
              processSuccess(res, i);
            },
            (reason) => {
              reject(reason);
            }
          );
        } else {
          // 如果不是 promise，则直接存入数组
          processSuccess(p, i);
        }
      }
    });
  }

  /**
   * 传入一个 promises 数组
   * 当其中一个 promise 首先转变状态时，返回其结果（无论成功或失败）
   * 当元素不是 promise 时，直接返回该元素
   */
  static race(promises) {
    // 判断传入的参数是否可迭代
    MyPromise.#isIterator(promises);

    return new MyPromise((resolve, reject) => {
      for (let i = 0; i < promises.length; i++) {
        const p = promises[i];
        if (p && typeof p.then === "function") {
          p.then(resolve, reject);
        } else {
          resolve(p);
        }
      }
    });
  }

  /**
   * 传入一个 promises 数组
   * 当其中一个 promise 首先变为成功态时，返回其结果
   * 当元素不是 promise 时，直接返回该元素
   */
  static any(promises) {
    MyPromise.#isIterator(promises);

    return new MyPromise((resolve, reject) => {
      const result = [];
      let times = 0;

      for (let i = 0; i < promises.length; i++) {
        const p = promises[i];
        if (p && typeof p.then === "function") {
          p.then(resolve, (reason) => {
            result[i] = reason;
            if (++times === promises.length) {
              reject(new AggregateError(result, "All promises were rejected"));
            }
          });
        } else {
          resolve(p);
        }
      }

      // 如果是空数组，则返回异常
      if (times === 0) {
        reject(new AggregateError(result, "All promises were rejected"));
      }
    });
  }

  /**
   * 传入一个 promises 数组
   * 只有等到参数数组的所有 Promise 对象都发生状态变更（不管是fulfilled还是rejected），返回的 Promise 对象才会发生状态变更。
   */
  static allSettled(promises) {
    MyPromise.#isIterator(promises);

    return new MyPromise((resolve, reject) => {
      const result = [];
      let times = 0;

      const processComplete = (data, index, status) => {
        result[index] = {
          status,
          ...data,
        };

        if (++times === promises.length) {
          resolve(result);
        }
      };

      for (let i = 0; i < promises.length; i++) {
        const p = promises[i];
        if (p && typeof p.then === "function") {
          p.then(
            (value) => {
              processComplete({ value }, i, MyPromise.FULFILLED);
            },
            (reason) => {
              processComplete({ reason }, i, MyPromise.REJECTED);
            }
          );
        } else {
          processComplete({ value: p }, i, MyPromise.FULFILLED);
        }
      }
    });
  }

  /**
   * 判断参数是否是可迭代的对象
   */
  static #isIterator(data) {
    if (!data || typeof data[Symbol.iterator] !== "function") {
      throw new TypeError(
        `${typeof data} ${data} is not iterable (cannot read property Symbol(Symbol.iterator))`
      );
    }
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
