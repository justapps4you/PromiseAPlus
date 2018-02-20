// https://promisesaplus.com/#notes
const STATE = {PENDING: 0, FULFILLED: 1, REJECTED: 2};
function Promise(executor) {
    this.currentSate = STATE.PENDING;
    this.fulfillCallbacks = [];
    this.rejectCallbacks = [];
    if (typeof executor !== 'function') return Promise.reject('Executor is not a Function');
    var promise = this;
    executor(
        function(value) { resolveOrReject(promise, value, STATE.FULFILLED) },
        function(reason) { resolveOrReject(promise, reason, STATE.REJECTED) }
    );
    return this;
}
Promise.prototype.then = function (onFulfilled, onRejected) {
    var promise = new Promise(function () {});
    // 2.2.6.1 If/when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then
    this.fulfillCallbacks.push(CallBack(promise, onFulfilled, STATE.FULFILLED));
    // 2.2.6.2 If/when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then
    this.rejectCallbacks.push(CallBack(promise, onRejected, STATE.REJECTED));
    resolveOrReject(this);
    // 2.2.7 then must return a promise [3.3].
    return promise;
};
function resolveOrReject(promise, value, state) {
    if(state !== undefined) {
        if (promise.currentSate !== STATE.PENDING) return;
        promise.value = value;
        // 2.2.2.2 (onFulfilled) it must not be called before promise is fulfilled
        // 2.2.3.2 (onRejected) it must not be called before promise is rejected
        promise.currentSate = state;
    }
    // 2.3.2.1 If x is pending, promise must remain pending until x is fulfilled or rejected
    if (promise.currentSate === STATE.PENDING) return;
    var callbacks = (promise.currentSate === STATE.FULFILLED) ? promise.fulfillCallbacks : promise.rejectCallbacks;
    setTimeout( // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code. [3.1]
        function() { // 2.2.5 onFulfilled and onRejected must be called as functions (i.e. with no this value). [3.2]
            callbacks.forEach( // 2.2.6 then may be called multiple times on the same promise
                function(cb){
                    // 2.2.2.1 (onFulfilled) it must be called after promise is fulfilled, with promise’s value as its first argument.
                    // 2.2.3.1 (onRejected) it must be called after promise is fulfilled, with promise’s value as its first argument.
                    cb(promise.value);
                }
            )
        }
    );
    // 2.2.2.3 (onFulfilled) it must not be called more than once
    // 2.2.3.3 (onRejected) it must not be called more than once
    promise.fulfillCallbacks = [];
    promise.rejectCallbacks = [];
}
function CallBack(promise, callback, state) {
    return function (value) {
        // 2.2.1 Both onFulfilled and onRejected are optional arguments (see 2.2.1 NOTE)
        // 2.2.1.1 If onFulfilled is not a function, it must be ignored (see 2.2.1 NOTE)
        // 2.2.1.2 If onRejected is not a function, it must be ignored (see 2.2.1 NOTE)
        if (typeof callback !== 'function'){
            // 2.2.7.3 If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value as promise1
            // 2.2.7.4 If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason as promise1
            resolveOrReject(promise, value, state); // 2.2.1 NOTE: ignored by recursive call with empty fulfillCallbacks & rejectCallbacks lists
        }
        var x;
        try {
            x = callback(value);
        } catch (e) {
            // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason
            resolveOrReject(promise, e, STATE.REJECTED);
        }
        if (x === promise) resolveOrReject(promise, new TypeError('same object'), STATE.REJECTED);// 2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason
        if (x instanceof Promise) x.then( // 2.3.2 If x is a promise, adopt its state [3.4]
            function(value){ resolveOrReject(promise, value, STATE.FULFILLED)}, // 2.3.2.2 If/when x is fulfilled, fulfill promise with the same value
            function(reason){ resolveOrReject(promise, reason, STATE.REJECTED)} // 2.3.2.3 If/when x is rejected, reject promise with the same reason
        );
        // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x)
        (function runThePromiseResolutionProcedure(x) {
            // 2.3.3 Otherwise, if x is an object or function
            if (x && typeof x === 'object' || typeof x === 'function') {
                var then;
                try {
                    then = x.then; // 2.3.3.1 Let then be x.then. [3.5]
                } catch (e) { // 2.3.3.2 if retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
                    resolveOrReject(promise, e, STATE.REJECTED);
                    return;
                }
                if (typeof then === 'function') { // 2.3.3.3 If then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise
                    var called = false; // for 2.3.3.3.3 and 2.3.3.3.4.1
                    try {
                        then.call(x, function(y) { // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y)
                            if (!called) { // 2.3.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored.
                                runThePromiseResolutionProcedure(y);
                                called = true; // for for 2.3.3.3.3 and 2.3.3.3.4.1
                            }
                        },function(r) { // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r
                            if (!called) { // 2.3.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored.
                                resolveOrReject(promise, r, STATE.REJECTED);
                                called = true; // for for 2.3.3.3.3 and 2.3.3.3.4.1
                            }
                        })
                    } catch (e) { // 2.3.3.3.4 If calling then throws an exception e
                        if(!called) { // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it
                            resolveOrReject(promise, e, STATE.REJECTED);// 2.3.3.3.4.2 Otherwise, reject promise with e as the reason
                        }
                    }
                } else { // 2.3.3.4 If then is not a function, fulfill promise with x
                    resolveOrReject(promise, x, STATE.FULFILLED);
                }
            } else { // 2.3.4 If x is not an object or function, fulfill promise with x
                resolveOrReject(promise, x, STATE.FULFILLED);
            }
        })(x);
    }
}
/* OPTIONAL */
// Promise.prototype.catch = function (reject) { return this.then(undefined, reject) };
// Promise.reject = function (reason) {
//     var promise = new Promise(function () {});
//     resolveOrReject(promise, reason, STATE.REJECTED);
//     return promise;
// };
// Promise.resolve = function (data) {
//     if (data instanceof Promise) return data;
//     return new Promise(function(resolve) { resolve(data)});
// };
module.exports = Promise;