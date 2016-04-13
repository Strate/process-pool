'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _functionLimit = require('../functionLimit');

var _functionLimit2 = _interopRequireDefault(_functionLimit);

var _invert = require('../invert');

var _invert2 = _interopRequireDefault(_invert);

var delay = function delay(time) {
  return new _bluebird2['default'](function (resolve) {
    return setTimeout(resolve, time);
  });
};

describe('function limit', function () {
  it('should limit active promises to two, queuing third call', function () {
    var defs = _lodash2['default'].range(0, 3).map(_bluebird2['default'].defer);
    var nCalls = 0;
    var pool = (0, _functionLimit2['default'])(function () {
      return defs[nCalls++].promise;
    }, 2);
    var promises = _lodash2['default'].range(0, 3).map(function () {
      return pool();
    });

    return delay(10).then(function () {
      nCalls.should.equal(2);
      defs[0].fulfill();
      return promises[0];
    }).then(function () {
      nCalls.should.equal(3);
      defs[1].fulfill();
      defs[2].fulfill();
      return _bluebird2['default'].all(promises.slice(1));
    });
  });

  it('should queue a call according to limits until a running function rejects', function () {
    var defs = _lodash2['default'].range(0, 3).map(_bluebird2['default'].defer);
    var nCalls = 0;
    var pool = (0, _functionLimit2['default'])(function () {
      return defs[nCalls++].promise;
    }, 2);
    var promises = _lodash2['default'].range(0, 3).map(function () {
      return pool();
    });

    return delay(10).then(function () {
      nCalls.should.equal(2);
      defs[0].reject();
      return (0, _invert2['default'])(promises[0]);
    }).then(function () {
      // this would be 2 if the rejection was not caught and another function scheduled
      nCalls.should.equal(3);
      defs[1].fulfill();
      defs[2].fulfill();
      return _bluebird2['default'].all(promises.slice(1));
    });
  });
});
//# sourceMappingURL=functionLimit.spec.js.map