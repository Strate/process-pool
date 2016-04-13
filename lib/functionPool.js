'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var PooledFunction = (function () {
  function PooledFunction(funcs) {
    _classCallCheck(this, PooledFunction);

    this.free = funcs.slice(0);
    this.running = [];
    this.callQueue = [];
  }

  /**
   * This schedules work out to a number of promise returning functions, after
   * each function has been called it will remain unavailable for future calls
   * until the promise returned by the outstanding call is resolved or rejected.
   */

  _createClass(PooledFunction, [{
    key: 'getNextFreeFunction',
    value: function getNextFreeFunction() {
      var _this = this;

      if (this.free.length) {
        var func = this.free.shift();
        this.running.push(func);
        return _bluebird2['default'].resolve(func);
      } else {
        return new _bluebird2['default'](function (resolve) {
          _this.callQueue.push(function (func) {
            // running.push must be here so it can happen
            // in the same tick as it's removal from `free`
            _this.running.push(func);
            resolve(func);
          });
        });
      }
    }
  }, {
    key: '_callPriorityFunctions',
    value: function _callPriorityFunctions(func) {
      var _this2 = this;

      var priorityWork = func.priorityWork;

      var _priorityWork$shift = priorityWork.shift();

      var resolve = _priorityWork$shift.resolve;
      var args = _priorityWork$shift.args;

      // this is implemented recursively so that it can deal with extra priority
      // work that is scheduled while it processes existing priority work
      func.apply(undefined, _toConsumableArray(args)).then(function (result) {
        if (priorityWork.length === 0) {
          delete func.priorityWork;
          _this2.running.splice(_this2.running.indexOf(func), 1);
          _this2._addToFreeQueue(func);
          resolve(result);
        } else {
          resolve(result);
          _this2._callPriorityFunctions(func);
        }
      });
    }

    /**
     * Mark a function call as complete, it will be assigned to new work if any
     * is available otherwise it will return to the free queue.
     * @pre function must not be in running queue.
     */
  }, {
    key: '_addToFreeQueue',
    value: function _addToFreeQueue(func) {
      if (func.priorityWork) {
        this.running.push(func);
        this._callPriorityFunctions(func);
      } else if (this.callQueue.length) {
        this.callQueue.shift()(func);
      } else {
        this.free.push(func);
      }
    }
  }, {
    key: 'replace',
    value: function replace(func, replacement) {
      var idx = this.running.indexOf(func);
      if (idx !== -1) this.running.splice(idx, 1);else this.free.splice(this.free.indexOf(func), 1);

      this._addToFreeQueue(replacement);
    }
  }, {
    key: '_callComplete',
    value: function _callComplete(func) {
      var runningIdx = this.running.indexOf(func);
      // it could have been removed by a call to `replace`
      if (runningIdx !== -1) {
        this.running.splice(runningIdx, 1);
        this._addToFreeQueue(func);
      }
    }
  }, {
    key: 'schedule',
    value: function schedule() {
      var _this3 = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return this.getNextFreeFunction().then(function (func) {
        return func.apply(undefined, args).then(function (result) {
          _this3._callComplete(func);
          return result;
        })['catch'](function (err) {
          _this3._callComplete(func);
          throw err;
        });
      });
    }
  }, {
    key: 'all',
    value: function all() {
      var _this4 = this;

      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var running = this.running;

      var free = this.free.slice();
      this.free.length = 0;

      var promises = free.map(function (func) {
        return func.apply(undefined, args);
      });

      var runningPromises = running.map(function (func) {
        return new _bluebird2['default'](function (resolve) {
          var priorityWork = func.priorityWork;

          var data = { resolve: resolve, args: args };
          if (priorityWork) priorityWork.push(data);else func.priorityWork = [data];
        });
      });

      if (runningPromises.length) promises.push.apply(promises, _toConsumableArray(runningPromises));

      running.push.apply(running, _toConsumableArray(free));

      return _bluebird2['default'].all(promises).then(function (results) {
        // or maybe it should be running...
        free.forEach(function (func) {
          running.splice(running.indexOf(func), 1);
          _this4._addToFreeQueue(func);
        });
        return results;
      });
    }
  }]);

  return PooledFunction;
})();

exports['default'] = function (funcs) {
  var pooled = new PooledFunction(funcs);

  var ret = pooled.schedule.bind(pooled);
  ret.replace = pooled.replace.bind(pooled);
  ret.all = pooled.all.bind(pooled);
  ret.free = pooled.free;
  ret.running = pooled.running;
  return ret;
};

module.exports = exports['default'];
//# sourceMappingURL=functionPool.js.map