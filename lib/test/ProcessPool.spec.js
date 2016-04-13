'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _ProcessPool = require('../ProcessPool');

var _ProcessPool2 = _interopRequireDefault(_ProcessPool);

var _invert = require('../invert');

var _invert2 = _interopRequireDefault(_invert);

var _child_process = require("child_process");

describe('process pool', function () {
  var pool;
  beforeEach(function () {
    return pool = new _ProcessPool2['default']({ processLimit: 2 });
  });
  afterEach(function () {
    return pool.destroy();
  });

  it('should create a sub-process that can accept arguments and return a value', function () {
    var func = pool.prepare(function () {
      return function (arg1, arg2) {
        return arg1 * arg2 * 10;
      };
    });
    return func(2, 3).then(function (v) {
      func.running.length.should.equal(0);
      v.should.equal(60);
    });
  });

  it('ready() call should return promise that resolves when all subprocesses are ready', function () {
    var func = pool.prepare(function () {
      return function () {};
    });
    return pool.ready();
  });

  it('should create a sub-process that can accept arguments and return a value from a Promise', function () {
    var func = pool.prepare(function () {
      var Promise = require('bluebird');
      return function (arg1, arg2) {
        return Promise.resolve(arg1 * arg2 * 10);
      };
    });
    return func(2, 3).then(function (v) {
      v.should.equal(60);
    });
  });

  it('should catch a thrown exception in a sub-process and fail the promise', function (done) {
    var func = pool.prepare(function () {
      return function (arg1, arg2) {
        throw Error('ohno');
      };
    });
    return (0, _invert2['default'])(func(2, 3)).then(function (err) {
      err.message.should.equal('ohno');
      done();
    });
  });

  it('should pass context to prepare call', function () {
    var func = pool.prepare(function (ctxt) {
      var Promise = require('bluebird');
      return function (arg1, arg2) {
        return Promise.resolve(arg1 + arg2 + ctxt);
      };
    }, 10);
    return func(2, 3).then(function (v) {
      v.should.equal(15);
    });
  });

  it('should require node modules using the parent process module.paths', function () {
    module.paths.push(__dirname + '/node_modules.test');

    var func = pool.prepare(function (ctxt) {
      var friender = require('friender');
      // would throw without module.filename being set via module
      require('./node_modules.test/friender/index.js');

      return function () {
        return friender.friend || 'unknown';
      };
    });
    // TODO: use indirect require to test this instead of previous line
    // }, null, { module })

    return func().then(function (v) {
      v.should.equal('treebear');
    });
  });

  it('should schedule three calls across two processes', function () {
    var subprocFunc = pool.prepare(function () {
      var Promise = require('bluebird');
      return function () {
        return Promise.delay(Date.now(), 100);
      };
    });

    return pool.ready().then(function () {
      return _bluebird2['default'].all([subprocFunc(), subprocFunc(), subprocFunc()]);
    }).then(function (vals) {
      vals.length.should.equal(3);
      Math.abs(vals[0] - vals[1]).should.be.below(50);
      var longDiff = vals[2] - vals[1];
      longDiff.should.be.above(99);
    });
  });

  it('should kill active process when requested', function () {
    var subprocFunc = pool.prepare(function () {
      var Promise = require('bluebird');
      return function () {
        return Promise.delay(Date.now(), 100);
      };
    });
    var func = pool.preparedFuncs[0];

    return pool.ready().then(function () {
      func.pool.free.length.should.equal(2);
      func.pool.running.length.should.equal(0);

      var callPromise = subprocFunc();

      return _bluebird2['default'].delay(10).then(function () {
        func.pool.free.length.should.equal(1);
        func.pool.running.length.should.equal(1);
        var killed = subprocFunc.kill();
        killed.length.should.equal(1);
        return (0, _invert2['default'])(callPromise);
      });
    }).then(function (err) {
      err.message.should.equal('killed');
      func.subProcesses.length.should.equal(2);
      func.pool.free.length.should.equal(2);
      func.pool.running.length.should.equal(0);

      // wait for replace function to ready...
      return pool.ready();
    }).then(function () {
      return _bluebird2['default'].all([subprocFunc(), subprocFunc()]);
    }).then(function (vals) {
      vals.length.should.equal(2);
      Math.abs(vals[0] - vals[1]).should.be.below(50);
    });
  });

  it('should call onChildProcessSpawned callback on child process ready', function () {
    function worker() {}
    var calledCount = 0;
    var childProcesses = [];
    function onChildProcessSpawned(childProcess) {
      childProcesses.push(childProcess);
    }
    pool.prepare(worker, null, { processLimit: 4, onChildProcessSpawned: onChildProcessSpawned });
    return pool.ready().then(function () {
      childProcesses.length.should.be.equal(4);
    });
  });
});
//# sourceMappingURL=ProcessPool.spec.js.map