const STATE = {PENDING: 0, FULFILLED: 1, REJECTED: 2};
function Promise(executor) {
    this.currentSate = STATE.PENDING;
    this.fulfillCallbacks = [];
    this.rejectCallbacks = [];
    try {
        var promise = this;
        executor(
            function(value) { resolveOrReject(promise, value, STATE.FULFILLED) },
            function(reason) { resolveOrReject(promise, reason, STATE.REJECTED) }
        );
    } catch (e) {
        return Promise.reject(e)
    }
    return this;
}
function resolveOrReject(promise, value, state) {
    if (promise.currentSate !== STATE.PENDING) return;
    promise.value = value;
    promise.currentSate = state;
    runPromise(promise);
}
Promise.prototype.then = function (onFulfilled, onRejected) {
    if (this.constructor.class !== Promise.class) { throw TypeError('Constructor incompatible') }
    var promise = new Promise(function () {});
    this.fulfillCallbacks.push(CallBack(promise, onFulfilled, STATE.FULFILLED));
    this.rejectCallbacks.push(CallBack(promise, onRejected, STATE.REJECTED));
    runPromise(this);
    return promise;
};
function runPromise(promise) {
    if (promise.currentSate === STATE.PENDING) return;
    var callbacks = (promise.currentSate === STATE.FULFILLED) ? promise.fulfillCallbacks : promise.rejectCallbacks;
    setTimeout(function() { callbacks.forEach(function(cb){ cb(promise.value)} ) });
    promise.fulfillCallbacks = [];
    promise.rejectCallbacks = [];
}
function CallBack(promise, callback, state) {
    return function (value) {
        if (typeof callback !== 'function') resolveOrReject(promise, value, state);
        var x;
        try {
            x = callback(value);
        } catch (e) {
            resolveOrReject(promise, e, STATE.REJECTED);
        }
        if (x === promise) resolveOrReject(promise, new TypeError('same object'), STATE.REJECTED);
        if (x instanceof Promise) x.then(
            function(value){ resolveOrReject(promise, value, STATE.FULFILLED)},
            function(reason){ resolveOrReject(promise, reason, STATE.REJECTED)}
        );
        (function resolvePromise(x) {
            if (x && typeof x === 'object' || typeof x === 'function') {
                var then;
                try {
                    then = x.then;
                } catch (e) {
                    resolveOrReject(promise, e, STATE.REJECTED);
                    return;
                }

                if (typeof then === 'function') {
                    var called = false;
                    try {
                        then.call(x, function(y) {
                            if (!called) {
                                resolvePromise(y);
                                called = true;
                            }
                        },function(r) {
                            if (!called) {
                                resolveOrReject(promise, r, STATE.REJECTED);
                                called = true;
                            }
                        })
                    } catch (e) {
                        !called && resolveOrReject(promise, e, STATE.REJECTED);
                    }
                } else {
                    resolveOrReject(promise, x, STATE.FULFILLED);
                }
            } else {
                resolveOrReject(promise, x, STATE.FULFILLED);
            }
        })(x);
    }
}
Promise.reject = function (reason) {
    if (typeof this !== 'function') throw TypeError('Constructor incompatible');
    if (this.class !== Promise.class) throw TypeError('Not a Promise');
    let promise = new Promise(function () {});
    resolveOrReject(promise, reason, STATE.REJECTED);
    return promise;
}
Promise.resolve = function (data) {
    if (typeof this !== 'function') throw TypeError('Constructor incompatible')
    if (this.class !== Promise.class) throw TypeError('Not a Promise');
    if (data instanceof Promise) return data;
    return new Promise(function(resolve) { resolve(data)});
}
module.exports = Promise;