/**
 * asyncHandler: 包装异步控制器，把异常转交给 errorHandler
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};