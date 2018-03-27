'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadVideo = loadVideo;

var _stream = require('stream');

var _https = require('https');

var _url = require('url');

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _httpsProxyAgent = require('https-proxy-agent');

var _httpsProxyAgent2 = _interopRequireDefault(_httpsProxyAgent);

var _Errors = require('./Errors');

var _signature = require('./signature');

var _config = require('./config');

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class YouTubeReader extends _stream.Readable {

  constructor(id, { host, protocol }) {
    super();

    this.getAdaptiveFmt = async html => {
      // 音视频不同资源，暂时不用
      return this.getFmt(html);
      (0, _debug2.default)('Get adaptive fmt');
      const result = html.match(YouTubeReader.adaptiveFmtReg);
      if (!result) {
        return this.getFmt(html);
      }
      const data = _querystring2.default.parse(result[1].replace(/\\u0026/g, '&'));
      (0, _debug2.default)(`Adaptive data is \n ${JSON.stringify(data, null, '\t')}`);
      const availableIndex = [];
      data.type.forEach((item, index) => {
        if (item.startsWith('video/mp4')) {
          availableIndex.push(index);
        }
      });

      const targets = {};
      await Promise.all(availableIndex.map(async index => {
        let url = data.url[index];
        const itag = data.itag[index];
        let quality = data.quality_label;

        if (Array.isArray(quality)) {
          // Normal situation
          quality = data.quality_label[index].split(',')[0];
        } else {
          // Sometime quality return only 1080p
          quality = `${data.size[index].split('x')[1]}p`;
        }
        if (data.sp && (data.sp[index] === 'signature' || data.sp === 'signature')) {
          const signature = await YouTubeReader.getDecryptedSignature(html, data.s[index]);

          if (signature) {
            url = `${url}&signature=${signature}`;
          }
        }

        targets[quality] = {
          url: this.getUrl(url),
          itag,
          quality,
          size: Array.isArray(data.size) ? data.size[index].split(',')[0] : data.size
        };
      })).catch(e => {
        console.error(e);
      });

      return Promise.resolve(this.getFmt(html, targets));
    };

    this.getFmt = async (html, targets = {}) => {
      (0, _debug2.default)('Get fmt');
      const result = html.match(YouTubeReader.fmtReg);

      if (!result) {
        (0, _debug2.default)('Video html not contain fmt info');
        const err = new _Errors.NotFoundError();
        this.destroy(err);
        return Promise.reject(err);
      }

      const types = result[1].split(',');

      await Promise.all(types.map(async t => {
        t = t.replace(/\\u0026/g, '&');
        /* eslint-disable prefer-const */
        let {
          quality, itag, url,
          type, s, sig, signature
        } = _querystring2.default.parse(t);
        /* eslint-enable */
        console.log(_querystring2.default.parse(t));
        if (!YouTubeReader.qualityMap[itag]) {
          return;
        }

        if (targets[YouTubeReader.qualityMap[itag]]) {
          return;
        }

        if (sig || signature) {
          url = `${url}&signature=${s || signature}`;
        } else if (s) {
          const decrypted = await YouTubeReader.getDecryptedSignature(html, s);
          if (decrypted) {
            url = `${url}&signature=${decrypted}`;
          }
        }

        url = this.getUrl(url);

        if (url) {
          targets[YouTubeReader.qualityMap[itag]] = {
            itag,
            url,
            quality,
            type,
            size: '1920x1080'
          };
        }
      })).catch(e => console.error(e));
      this.targets = targets;
      return Promise.resolve(targets);
    };

    this.getUrl = url => {
      try {
        const buff = Buffer.from(url);
        return `${_config.watchUrl.startsWith('http') ? _config.watchUrl : this.protocol + '//' + this.host + _config.watchUrl}?url=${buff.toString('base64')}`;
      } catch (e) {
        console.log(`Base64 Error: ${url}`);
      }
    };

    this.fetchVideo = () => {
      const { url } = this.targets[22];
      const options = (0, _url.parse)(url);
      if (_config.proxy) {
        const agent = new _httpsProxyAgent2.default(_config.proxy);
        options.agent = agent;
      }
      options.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:49.0) Gecko/20100101 Firefox/49.0'
      };
      (0, _debug2.default)('Start fetching video stream');
      const req = (0, _https.request)(options, res => {
        if (res.statusCode >= 300) {
          if (res.statusCode === 302) {
            (0, _debug2.default)('Redirect to new location');
            this.targets[22].url = res.headers.location;
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
            target.push([next, res.headers[next]]);
          }
          return target;
        }, []));

        res.on('data', chunk => {
          this.push(chunk);
        });
        res.on('end', () => {
          (0, _debug2.default)('Stream fetched');
          this.push(null);
        });
      });
      req.end();
    };

    if (!id) {
      this.destroy(new _Errors.NotFoundError());
    }
    this.id = id;
    this.host = host;
    this.protocol = protocol;

    this.getDownloadLink().then(this.getAdaptiveFmt)
    // .then(this.fetchVideo)
    .then(targets => {
      this.push(JSON.stringify(targets));
      this.push(null);
    }).catch(e => {
      if (!e && !(e instanceof _Errors.NotFoundError)) {
        console.error(`sth wrong with url ${this.url}`, e);
      }
    });
  }

  _read() {}

  _destroy(e) {
    this.emit('error', e);
  }

  getDownloadLink() {
    return new Promise((resolve, reject) => {
      const url = `https://www.youtube.com/watch?v=${this.id}`;
      this.url = url;
      const options = (0, _url.parse)(url);
      if (_config.proxy) {
        const agent = new _httpsProxyAgent2.default(_config.proxy);
        options.agent = agent;
      }

      let tm;
      (0, _debug2.default)('Start fetching video html');
      const req = (0, _https.request)(options, res => {
        if (res.statusCode > 300) {
          (0, _debug2.default)(`HTML response error with statusCode ${res.statusCode}`);
          const err = new _Errors.NotFoundError();
          this.destroy(err);
          reject(err);
        }
        let html = '';
        res.on('data', chunk => {
          clearTimeout(tm);
          html += chunk.toString();

          tm = setTimeout(() => {
            resolve(html);
          }, 1000);
        });
        res.on('end', () => {
          clearTimeout(tm);
          resolve(html);
        });
      });
      req.on('error', e => {
        (0, _debug2.default)(`HTML fetch error: ${e ? e.name : 'Unknow error'}, ${e ? e.message : ''}`);
        this.destroy(new _Errors.RequestFailError(999));
        reject(e);
      });
      req.end();
    });
  }

}

YouTubeReader.fmtReg = /url_encoded_fmt_stream_map["']:\s*["'](.+?)["']/;
YouTubeReader.adaptiveFmtReg = /adaptive_fmts["']:\s*["'](.+?)["']/;
YouTubeReader.playerJSReg = /<script\s* src="([^"]+?player[^"]+?\.js)/;
YouTubeReader.qualityMap = {
  18: '480p',
  22: '720p'
};

YouTubeReader.getDecryptedSignature = async function (html, s) {
  const playerScriptResult = html.match(YouTubeReader.playerJSReg);
  (0, _debug2.default)(`Video is like VEVO, with playerjs: ${playerScriptResult ? playerScriptResult[1] : 'Unknow'}`);
  if (playerScriptResult) {
    try {
      const decryptedSig = await new _signature.Signature(playerScriptResult[1]).decrypt(s);
      return decryptedSig;
    } catch (e) {}
  }
  return '';
};

function loadVideo(id, { host, protocol }) {
  (0, _debug2.default)(`Get youtube video with id: ${id}`);
  const stream = new YouTubeReader(id, { host, protocol });
  return stream;
}