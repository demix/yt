'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
class NotFoundError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'NotFoundError';
  }
}

exports.NotFoundError = NotFoundError;
class RequestFailError extends Error {
  constructor(code, ...params) {
    super(...params);
    this.name = 'RequestFailError';
    this.message = `statusCode: ${code}`;
  }
}
exports.RequestFailError = RequestFailError;
//# sourceMappingURL=Errors.js.map