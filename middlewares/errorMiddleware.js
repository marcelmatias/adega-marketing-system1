const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  const error = new Error(`Nao encontrado - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  logger.error(`${err.message} | ${req.originalUrl}`);

  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    res.locals.error = err.message;
    return res.status(statusCode).render('pages/error', { error: err.message, title: 'Erro' });
  }

  res.status(statusCode).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = { notFound, errorHandler };
