/**
 * Global error handler. Register last in app.js.
 * express-async-errors ensures all async route errors reach here.
 */
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const requestId = req.id ?? null    // set by pino-http
  const logger    = req.log ?? console

  logger.error({ err, requestId }, `${req.method} ${req.originalUrl} — ${err.message}`)

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))
    return res.status(400).json({ error: 'Validation failed', errors, requestId })
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({ error: `${field} already exists`, requestId })
  }

  // JWT errors (should rarely reach here — auth middleware handles them)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token', requestId })
  }

  const status = err.statusCode || err.status || 500
  res.status(status).json({
    error: err.message || 'Internal server error',
    requestId,
  })
}
