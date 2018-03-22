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
//# sourceMappingURL=Error.js.map