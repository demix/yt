'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Signature = undefined;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _httpsProxyAgent = require('https-proxy-agent');

var _httpsProxyAgent2 = _interopRequireDefault(_httpsProxyAgent);

var _https = require('https');

var _url = require('url');

var _vm = require('vm');

var _vm2 = _interopRequireDefault(_vm);

var _config = require('./config');

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Signature {

  static run(name, target) {
    return new Promise((resolve, reject) => {
      const sandbox = {
        global: { target },
        addEventListener() {},
        removeEventListener() {},
        document: {
          addEventListener() {}
        },
        location: {},
        navigator: {}
      };
      if (Signature.runningVmMap[name]) {
        Signature.runningVmMap[name].runInNewContext(sandbox);
        resolve(sandbox.finalResult);
      } else {
        _fs2.default.readFile(_path2.default.resolve(Signature.cacheFolder, name), (err, data) => {
          if (err) {
            console.error(err);
            reject(err);
            return;
          }
          const script = new _vm2.default.Script(`${data.toString()}; finalResult = global.decrypt(global.target)`);
          Signature.runningVmMap[name] = script;
          script.runInNewContext(sandbox);
          setTimeout(() => {
            delete Signature.runningVmMap[name];
          }, 5000);
          resolve(sandbox.finalResult);
        });
      }
    });
  }

  constructor(url) {
    if (!url.startsWith('http')) {
      url = `https://www.youtube.com${url.startsWith('/') ? '' : '/'}${url}`;
    }
    this.url = url;
    this.name = url.replace(/^https?:\/\/[^/]+\//, '').replace(/\//g, '_');

    Signature.ensure(this.name, this.url);
  }

  decrypt(s) {
    return Signature.ensure(this.name, this.url).then(() => {
      return Signature.run(this.name, s);
    }).then(result => {
      return result;
    });
  }
}
exports.Signature = Signature;
Signature.cacheFolder = _path2.default.resolve(process.cwd(), '.player.js');
Signature.downloadingMap = {};
Signature.runningVmMap = {};

Signature.ensure = async function (name, url) {
  const file = _path2.default.resolve(Signature.cacheFolder, name);
  return new Promise(resolve => {
    _fs2.default.stat(file, (err, stats) => {
      if (stats && stats.isFile()) {
        (0, _debug2.default)(`Player.js file exists: ${name}`);
        resolve();
      } else if (Signature.downloadingMap[name]) {
        resolve(Signature.downloadingMap[name]);
      } else {
        Signature.downloadingMap[name] = Signature.download(name, url);
        resolve(Signature.downloadingMap[name]);
      }
    });
  });
};

Signature.download = function (name, url) {
  const options = (0, _url.parse)(url);
  if (_config.proxy) {
    const agent = new _httpsProxyAgent2.default(_config.proxy);
    options.agent = agent;
  }
  return new Promise(resolve => {
    let body = '';
    function done() {
      (0, _debug2.default)('Player.js fetched');

      const fnNameResult = body.match(/['"]signature['"]\),.+?\.set\(.+?,(.+?)\(/);

      if (!fnNameResult) {
        console.error('Can\'t find decrypt function');
      }
      const fnName = fnNameResult[1];
      body = body.replace(`${fnName}=`, `global.decrypt=${fnName}=`);

      _fs2.default.writeFile(_path2.default.resolve(Signature.cacheFolder, name), body, err => {
        if (err) {
          console.log(err);
          // TODO
        } else {
          delete Signature.downloadingMap[name];
          resolve();
        }
      });
    }

    let tm;
    (0, _debug2.default)(`Start fetching player.js: ${url}`);
    (0, _https.get)(options, res => {
      if (res.statusCode >= 300) {
        // resolve()
        (0, _debug2.default)(`Player.js fetch error: ${res.statusCode}`);
        return;
      }
      res.on('data', chunk => {
        clearTimeout(tm);
        body += chunk.toString();

        tm = setTimeout(() => {
          done();
        }, 3000);
      });
      res.on('end', () => {
        clearTimeout(tm);
        done();
      });
    });
  });
};
//# sourceMappingURL=signature.js.map