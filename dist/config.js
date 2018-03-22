'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.watchUrl = exports.proxy = undefined;

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const proxy = exports.proxy = process.env.https_proxy || process.env.http_proxy;
const watchUrl = exports.watchUrl = '/watch';

if (proxy) {
  (0, _debug2.default)(`Using proxy ${proxy}`);
}
//# sourceMappingURL=config.js.map