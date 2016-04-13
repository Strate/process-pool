// Invert promise resolution/rejection
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports["default"] = function (prom) {
  return prom.then(function (v) {
    throw Error(v);
  }, function (v) {
    return v;
  });
};

module.exports = exports["default"];
//# sourceMappingURL=invert.js.map