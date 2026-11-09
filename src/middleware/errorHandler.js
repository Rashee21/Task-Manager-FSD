// Centralised error handler: every error becomes one structured JSON shape.
// Usage: throw an Error with .status (default 500) and optionally .details.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const body = { error: { message: err.message || 'Internal server error', code: err.code || 'INTERNAL_ERROR' } };
  if (err.details) body.error.details = err.details;
  if (process.env.NODE_ENV !== 'production') body.error.stack = undefined;
  res.status(status).json(body);
}
function notFound(req, res) {
  res.status(404).json({ error: { message: 'Route not found: ' + req.method + ' ' + req.originalUrl, code: 'NOT_FOUND' } });
}
module.exports = { errorHandler, notFound };
