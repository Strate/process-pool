'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

/**
 * This accepts a promise returning function and returns a function that allows
 * a limited number of unresolved promises to be active. Calls beyond this limit
 * will be queued.
 */

exports['default'] = function (func, limit) {
  var activeCalls = 0;
  var callQueue = [];

  var getFreeFunction = function getFreeFunction() {
    if (activeCalls < limit) {
      ++activeCalls;
      return _bluebird2['default'].resolve();
    } else {
      var deferred = _bluebird2['default'].pending();
      callQueue.push(deferred);
      return deferred.promise;
    }
  };

  var callComplete = function callComplete() {
    if (callQueue.length) callQueue.shift().fulfill();else --activeCalls;
  };

  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return getFreeFunction().then(function () {
      return _bluebird2['default'].resolve(func.apply(undefined, args)).then(function (result) {
        callComplete();
        return result;
      })['catch'](function (err) {
        callComplete();
        throw err;
      });
    });
  };
};

module.exports = exports['default'];
//# sourceMappingURL=functionLimit.js.map