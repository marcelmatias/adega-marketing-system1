const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

const authenticateAPI = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (req.session && req.session.user) {
        req.user = req.session.user;
        req.adegaId = req.session.user.adegaId;
        return next();
      }
      return res.status(401).json({ error: 'Token nao fornecido' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.secret, { algorithms: ['HS256'] });
    const user = await User.findById(decoded.id);
    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Usuario invalido' });
    }
    req.user = user;
    req.adegaId = user.adegaId?._id || user.adegaId;
    req.adega = user.adegaId;
    next();
  } catch (err) {
    logger.warn(`Falha autenticacao API: ${err.message}`);
    if (req.session && req.session.user) {
      req.user = req.session.user;
      req.adegaId = req.session.user.adegaId;
      return next();
    }
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
};

const authenticateView = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.locals.user = req.session.user;
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role || req.session.user?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }
    next();
  };
};

const sessionLogin = (req, user) => {
  const rawAdegaId = user.adegaId;
  let adegaIdStr = null;
  if (rawAdegaId) {
    adegaIdStr = typeof rawAdegaId === 'object' && rawAdegaId._id
      ? rawAdegaId._id.toString()
      : rawAdegaId.toString();
  }
  req.session.user = {
    _id: user._id.toString(),
    nome: user.nome,
    email: user.email,
    role: user.role,
    adegaId: adegaIdStr,
  };
};

module.exports = { authenticateAPI, authenticateView, authorize, sessionLogin };
