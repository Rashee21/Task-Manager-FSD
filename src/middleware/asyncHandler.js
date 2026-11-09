// Wraps an async route/service handler so thrown errors reach the central error handler
// instead of needing try/catch in every controller.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = asyncHandler;
