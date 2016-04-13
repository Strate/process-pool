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

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _functionPool = require('./functionPool');

var _functionPool2 = _interopRequireDefault(_functionPool);

var _functionLimit = require('./functionLimit');

var _functionLimit2 = _interopRequireDefault(_functionLimit);

/**
 * Take sub-process and wrap the messaging to/back into a function that accepts
 * arguments to send over IPC and returns a promise that will resolve to the
 * return value, received via IPC.
 */
function wrapSubprocess(subProcessPromise) {
  // TODO: use utility to bind promise from event instead of creating the promise manually
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return subProcessPromise.then(function (subProcess) {
      subProcess.send(args);

      return new _bluebird2['default'](function (resolve, reject) {
        var onExit = function onExit() {
          return reject(Error('killed'));
        };
        var onMessage = function onMessage(res) {
          if (typeof res === 'object' && null !== res) {
            if ('$$return$$' in res || '$$error$$' in res) {
              subProcess.removeListener('exit', onExit);
              subProcess.removeListener('message', onMessage);
              if ('$$return$$' in res) {
                resolve(res.$$return$$);
              } else {
                var err = Error(res.$$error$$);
                err.stack = res.stack;
                reject(err);
              }
            }
          }
        };
        subProcess.once('exit', onExit);
        subProcess.on('message', onMessage);
      });
    });
  };
}

/**
 * Pool class with fields:
 *  * length: Number of processes to run at any one time
 */

var _default = (function () {
  // TODO: default to number of CPU cores

  function _default() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var _ref$processLimit = _ref.processLimit;
    var processLimit = _ref$processLimit === undefined ? 4 : _ref$processLimit;

    _classCallCheck(this, _default);

    this.processLimit = processLimit;
    this._reset();
  }

  _createClass(_default, [{
    key: '_reset',
    value: function _reset() {
      this.limiter = (0, _functionLimit2['default'])(function (func) {
        return func();
      }, this.processLimit);
      this.preparedFuncs = [];
      this.nStarting = 0; // number of processes starting up
    }

    /**
     * Prepare a function to be run within a process
     * @param {Function} func This function is immediately executed when the
     * subprocess starts and should return another function that will handle
     * each call.
     * @param {Any} context Optional value to pass to the outter function within
     * the subprocess, it must be convertable to JSON.
     * @param {Object|undefined} options processLimit and replace options, usually
     * this.processLimit functions are spawned for each pooled function, this can be
     * used to set the limit lower or higher for a given function. Setting it higher
     * will not allow greater concurrency for this function but will allow the function
     * to deal with processes being killed more quickly.
     */
  }, {
    key: 'prepare',
    value: function prepare(func) {
      var context = arguments.length <= 1 || arguments[1] === undefined ? undefined : arguments[1];

      var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var _ref2$processLimit = _ref2.processLimit;
      var processLimit = _ref2$processLimit === undefined ? this.processLimit : _ref2$processLimit;
      var _module = _ref2.module;
      var _ref2$onChildProcessSpawned = _ref2.onChildProcessSpawned;
      var onChildProcessSpawned = _ref2$onChildProcessSpawned === undefined ? _lodash2['default'].noop : _ref2$onChildProcessSpawned;

      var funcData = {
        context: context,
        module: _module || module.parent,
        subProcesses: [],
        func: func
      };
      this.preparedFuncs.push(funcData);

      var ret = funcData.pool = (0, _functionPool2['default'])(this._spawnSubprocesses(processLimit, funcData, onChildProcessSpawned));
      ret.kill = this._kill.bind(this, funcData);
      return ret;
    }
  }, {
    key: '_spawnSubprocesses',
    value: function _spawnSubprocesses(count, funcData) {
      var _funcData$subProcesses,
          _this = this;

      var onChildProcessSpawned = arguments.length <= 2 || arguments[2] === undefined ? _lodash2['default'].noop : arguments[2];
      var module = funcData.module;
      var context = funcData.context;

      var spArgs = {
        $$prepare$$: funcData.func.toString(),
        modulePaths: module.paths,
        moduleFilename: module.filename
      };
      if (context) spArgs.context = context;

      // TODO: add hooks to detect subprocess exit failure
      var subProcesses = _lodash2['default'].range(0, count).map(function () {
        return _child_process2['default'].fork(_path2['default'].join(__dirname, 'childProcess'));
      });

      (_funcData$subProcesses = funcData.subProcesses).push.apply(_funcData$subProcesses, _toConsumableArray(subProcesses));

      this.nStarting += subProcesses.length;

      return subProcesses.map(function (subProc, idx) {
        var spPromise = new _bluebird2['default'](function (resolve) {
          subProc.send(spArgs);
          subProc.once('message', function () {
            onChildProcessSpawned(subProc);
            _this._subProcessReady();
            resolve(subProc);
          });
        });

        var wrapped = wrapSubprocess(spPromise);
        var ret = function ret() {
          for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          return _this.limiter(wrapped.bind.apply(wrapped, [_this].concat(args)));
        };
        ret.subProcess = subProcesses[idx];
        return ret;
      });
    }
  }, {
    key: '_kill',
    value: function _kill(funcData) {
      var pool = funcData.pool;
      var subProcesses = funcData.subProcesses;

      var killed = [];
      pool.running.forEach(function (runningFunc) {
        killed.push(runningFunc);
        var subProcess = runningFunc.subProcess;

        subProcess.kill();
        subProcesses.splice(subProcesses.indexOf(subProcess), 1);
      });

      if (killed.length > 0) {
        var newFuncs = this._spawnSubprocesses(killed.length, funcData);
        killed.forEach(function (func, idx) {
          pool.replace(func, newFuncs[idx]);
        });
      }

      return killed.map(function (funcData) {
        return funcData.subProcess.pid;
      });
    }
  }, {
    key: '_subProcessReady',
    value: function _subProcessReady() {
      --this.nStarting;
      if (this._onStart && this.nStarting === 0) {
        this._onStart.fulfill();
        delete this._onStart;
      }
    }

    /**
     * Return a promise that resolves when all of the subprocesses have started up.
     */
  }, {
    key: 'ready',
    value: function ready() {
      if (this.nStarting === 0) return _bluebird2['default'].resolve();

      if (!this._onStart) this._onStart = _bluebird2['default'].pending();
      return this._onStart.promise;
    }

    /**
     * Destroy all pooled subprocesses, do not use them after this.
     */
  }, {
    key: 'destroy',
    value: function destroy() {
      this.preparedFuncs.forEach(function (funcData) {
        funcData.subProcesses.forEach(function (proc) {
          return proc.kill();
        });
      });
      this._reset();
    }
  }]);

  return _default;
})();

exports['default'] = _default;
module.exports = exports['default'];
//# sourceMappingURL=ProcessPool.js.map