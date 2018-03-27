'use strict';

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _url = require('url');

var _youtube = require('./youtube');

var _Errors = require('./Errors');

var _VideoProxy = require('./VideoProxy');

var _VideoProxy2 = _interopRequireDefault(_VideoProxy);

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const port = process.env.PORT || 8006;

function NotFound(res, e) {
  if (e && !(e instanceof _Errors.NotFoundError)) {
    console.error(e);
  }
  res.statusCode = 404;
  res.end('NotFound');
}

const server = _http2.default.createServer((req, res) => {
  const { host, 'x-forwarded-protocol': protocol = 'http:' } = req.headers;
  (0, _debug2.default)(`Serve request with host ${host}`);

  const url = new _url.URL(req.url, `http://${host}`);

  switch (url.pathname.slice(1)) {
    case 'info':
      {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        const stream = (0, _youtube.loadVideo)(url.searchParams.get('v'), { host, protocol });
        stream.on('error', e => NotFound(res, e));
        stream.on('data', data => {
          res.write(data);
        });
        stream.on('setHeader', data => {
          data.forEach(([name, value]) => {
            res.setHeader(name, value);
          });
        });
        stream.on('end', () => {
          res.end();
        });
        return;
      }
    case 'watch':
      {
        const stream = new _VideoProxy2.default(url.searchParams.get('url'), {
          range: req.headers.range
        });
        res.setHeader('Access-Control-Allow-Origin', '*');
        stream.on('setHeader', data => {
          data.forEach(([name, value]) => {
            res.setHeader(name, value);
          });
        });
        stream.on('setCode', code => {
          res.statusCode = code;
        });
        stream.on('error', e => NotFound(res, e));
        stream.on('data', data => {
          res.write(data);
        });
        stream.on('end', () => res.end());
        return;
      }
    default:
      {
        NotFound(res);
      }
  }
});

server.listen(port);
console.log(`Server listening on ${port}`);