'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stream = require('stream');

var _https = require('https');

var _url = require('url');

var _httpsProxyAgent = require('https-proxy-agent');

var _httpsProxyAgent2 = _interopRequireDefault(_httpsProxyAgent);

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

var _Errors = require('./Errors');

var _config = require('./config');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class VideoProxy extends _stream.Readable {

  constructor(url, config) {
    super();
    this.url = Buffer.from(url, 'base64').toString();
    this.config = Object.assign({}, VideoProxy.defaultConfig, config);
    this.fetchVideo();
  }

  _read() {}

  fetchVideo() {
    const options = (0, _url.parse)(this.url);
    if (_config.proxy) {
      const agent = new _httpsProxyAgent2.default(_config.proxy);
      options.agent = agent;
    }
    options.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:49.0) Gecko/20100101 Firefox/49.0'
    };
    if (this.config.range) {
      options.headers.Range = this.config.range;
    }
    (0, _debug2.default)(`Start fetching video stream ${this.url}`);
    const req = (0, _https.request)(options, res => {
      if (res.statusCode >= 300) {
        if (res.statusCode === 302) {
          (0, _debug2.default)('Redirect to new location');
          this.url = res.headers.location;
          this.fetchVideo();
        } else {
          (0, _debug2.default)(`Video response error with statusCode ${res.statusCode}`);
          this.destroy(new _Errors.RequestFailError(res.statusCode));
        }
        return;
      }

      const targetHeaders = ['content-type', 'content-length', 'accept-ranges', 'content-range'];

      this.emit('setHeader', targetHeaders.reduce((target, next) => {
        if (res.headers[next]) {
          const upperNext = next.split('-').map(i => `${i.slice(0, 1).toUpperCase()}${i.slice(1)}`).join('-');
          target.push([upperNext, res.headers[next]]);
        }
        return target;
      }, []));
      this.emit('setCode', res.statusCode);

      res.on('data', chunk => {
        this.push(chunk);
      });
      res.on('end', () => {
        (0, _debug2.default)('Stream fetched');
        this.push(null);
      });
    });
    req.end();
  }
}
exports.default = VideoProxy;
VideoProxy.defaultConfig = {};
//# sourceMappingURL=VideoProxy.js.map