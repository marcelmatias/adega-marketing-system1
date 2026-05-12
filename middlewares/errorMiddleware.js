const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  const error = new Error(`Nao encontrado - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction && statusCode === 500
    ? 'Erro interno do servidor'
    : err.message;

  logger.error(`${err.message} | ${req.originalUrl}`);

  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    res.locals.error = message;
    return res.status(statusCode).render('pages/error', { error: message, title: 'Erro' });
  }

  res.status(statusCode).json({
    error: message,
    stack: isProduction ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
