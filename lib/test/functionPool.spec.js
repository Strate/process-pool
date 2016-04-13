'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _functionPool = require('../functionPool');

var _functionPool2 = _interopRequireDefault(_functionPool);

var _invert = require('../invert');

var _invert2 = _interopRequireDefault(_invert);

describe('function pool', function () {
  it('should schedule a single function call', function () {
    var pool = (0, _functionPool2['default'])([function (arg) {
      return _bluebird2['default'].resolve(arg + 5);
    }]);

    return pool(4).then(function (result) {
      result.should.equal(9);
    });
  });

  it('should schedule four calls over two functions', function () {
    var defs = _lodash2['default'].range(0, 4).map(_bluebird2['default'].defer);
    var nCalls = 0;
    var pool = (0, _functionPool2['default'])(_lodash2['default'].range(0, 2).map(function () {
      return function () {
        return defs[nCalls++].promise;
      };
    }));
    var promises = _lodash2['default'].range(0, 4).map(function () {
      return pool();
    });

    return _bluebird2['default'].delay(10).then(function () {
      nCalls.should.equal(2);
      defs[1].fulfill();
      return promises[1];
    }).then(function () {
      nCalls.should.equal(3);
      defs[0].fulfill();
      return promises[0];
    }).then(function () {
      nCalls.should.equal(4);
      defs[2].fulfill();
      defs[3].fulfill();
      return _bluebird2['default'].all(promises.slice(2));
    });
  });

  it('should schedule four calls over two functions accounting for rejections', function () {
    var defs = _lodash2['default'].range(0, 4).map(_bluebird2['default'].defer);
    var nCalls = 0;
    var pool = (0, _functionPool2['default'])(_lodash2['default'].range(0, 2).map(function () {
      return function () {
        return defs[nCalls++].promise;
      };
    }));
    var promises = _lodash2['default'].range(0, 4).map(function () {
      return pool();
    });

    return _bluebird2['default'].delay(10).then(function () {
      nCalls.should.equal(2);
      defs[1].reject();
      return (0, _invert2['default'])(promises[1]);
    }).then(function () {
      nCalls.should.equal(3);
      defs[0].reject();
      return (0, _invert2['default'])(promises[0]);
    }).then(function () {
      nCalls.should.equal(4);
      defs[2].fulfill();
      defs[3].fulfill();
      return _bluebird2['default'].all(promises.slice(2));
    });
  });

  it('should replace a free function with a replacement', function () {
    var pooled = _lodash2['default'].range(0, 2).map(function (idx) {
      return function () {
        return _bluebird2['default'].resolve((idx + 1) * 10);
      };
    });
    var pool = (0, _functionPool2['default'])(pooled);

    pool.replace(pooled[1], function () {
      return _bluebird2['default'].resolve(5);
    });

    return _bluebird2['default'].all([pool(), pool(), pool()]).then(function (vals) {
      vals.should.eql([10, 5, 10]);
    });
  });

  it('should replace a running function with a replacement', function () {
    var pooled = _lodash2['default'].range(0, 2).map(function (idx) {
      return function () {
        return _bluebird2['default'].delay((idx + 1) * 10, 100);
      };
    });
    var pool = (0, _functionPool2['default'])(pooled);

    var calls = [pool(), pool(), pool(), pool()];

    return _bluebird2['default'].delay(10).then(function () {
      pool.replace(pooled[1], function () {
        return _bluebird2['default'].resolve(5);
      });
      return _bluebird2['default'].delay(10);
    }).then(function () {
      calls[0].isFulfilled().should.be['false'];
      calls[1].isFulfilled().should.be['false'];
      calls[2].isFulfilled().should.be['true'];
      calls[3].isFulfilled().should.be['true'];
      return _bluebird2['default'].all(calls);
    }).then(function (vals) {
      vals.should.eql([10, 20, 5, 5]);
    });
  });

  var setDelayFunction = function setDelayFunction(data, instruction) {
    var set = instruction.set;
    var delay = instruction.delay;

    if (set) {
      var oldVal = data.field;
      data.field = set;
      return _bluebird2['default'].resolve(data.idx + oldVal);
    } else if (delay) return _bluebird2['default'].delay(data.idx + data.field, delay);
  };

  it('should call all free functions via `all`', function () {
    var pooled = _lodash2['default'].range(0, 2).map(function (idx) {
      return setDelayFunction.bind(null, { idx: idx, field: 0 });
    });
    var pool = (0, _functionPool2['default'])(pooled);

    return _bluebird2['default'].all([pool.all({ set: 10 }), pool({ delay: 100 }), pool({ delay: 100 })]).then(function (results) {
      results.should.eql([[0, 1], 10, 11]);
      pool.running.should.have.length(0);
      pool.free.should.have.length(2);
    });
  });

  it('should call one free and one running function (when ready) via `all`', function () {
    var pooled = _lodash2['default'].range(0, 2).map(function (idx) {
      return setDelayFunction.bind(null, { idx: idx, field: 0 });
    });
    var pool = (0, _functionPool2['default'])(pooled);

    return _bluebird2['default'].all([pool({ delay: 50 }), pool.all({ set: 10 }), pool({ delay: 100 }), pool({ delay: 100 }), pool({ delay: 100 }), pool({ delay: 100 })]).then(function (results) {
      results.should.eql([0, [1, 0], 10, 11, 10, 11]);
      pool.running.should.have.length(0);
      pool.free.should.have.length(2);
    });
  });
});
//# sourceMappingURL=functionPool.spec.js.map