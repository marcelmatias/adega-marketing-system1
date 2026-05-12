const jwt = require('jsonwebtoken');
const User = require('../models/User');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');
const { sessionLogin } = require('../middlewares/authMiddleware');

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha obrigatorios' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('adegaId');
    if (!user) return res.status(401).json({ error: 'Email nao encontrado' });
    if (!(await user.compararSenha(senha))) return res.status(401).json({ error: 'Senha incorreta' });
    if (!user.ativo) return res.status(401).json({ error: 'Usuario inativo' });

    const token = jwt.sign(
      { id: user._id, adegaId: user.adegaId?._id || user.adegaId, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    sessionLogin(req, user);
    logger.info(`Login API OK: ${user.role}`);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    logger.error(`Erro no login API: ${err.message}`);
    res.status(500).json({ error: 'Erro ao autenticar' });
  }
};

exports.loginView = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      req.flash('error', 'Preencha email e senha');
      return res.redirect('/login');
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      req.flash('error', 'Email nao cadastrado. Execute npm run seed');
      return res.redirect('/login');
    }
    if (!(await user.compararSenha(senha))) {
      req.flash('error', 'Senha incorreta');
      return res.redirect('/login');
    }
    if (!user.ativo) {
      req.flash('error', 'Usuario inativo');
      return res.redirect('/login');
    }

    sessionLogin(req, user);

    if (!req.session.user) {
      req.flash('error', 'Erro ao criar sessao');
      return res.redirect('/login');
    }

    req.session.save((err) => {
      if (err) {
        logger.error(`Erro ao salvar sessao: ${err.message}`);
        req.flash('error', 'Erro ao criar sessao');
        return res.redirect('/login');
      }
      logger.info(`Login OK: ${user.email} (${user.role})`);
      res.redirect('/admin');
    });
  } catch (err) {
    logger.error(`Erro no login view: ${err.message}`);
    req.flash('error', 'Erro ao autenticar: ' + err.message);
    res.redirect('/login');
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

exports.registrar = async (req, res) => {
  try {
    const { nome, email, senha, adegaId } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha obrigatorios' });
    }
    if (!adegaId && (!req.session?.user?.adegaId)) {
      return res.status(400).json({ error: 'Adega nao informada' });
    }
    const existe = await User.findOne({ email: email.toLowerCase().trim() });
    if (existe) return res.status(400).json({ error: 'Email ja cadastrado' });
    const adega = adegaId || req.session?.user?.adegaId;
    const user = await User.create({
      nome,
      email: email.toLowerCase().trim(),
      senha,
      role: 'staff',
      adegaId: adega,
    });
    logger.info(`Usuario criado: ${user.email}`);
    res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    logger.error(`Erro ao registrar: ${err.message}`);
    res.status(400).json({ error: 'Erro ao criar usuario' });
  }
};

exports.loginTv = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      req.flash('error', 'Preencha email e senha');
      return res.redirect('/tv/login');
    }
    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'tv' });
    if (!user) {
      req.flash('error', 'Credenciais de TV invalidas');
      return res.redirect('/tv/login');
    }
    if (!(await user.compararSenha(senha))) {
      req.flash('error', 'Senha incorreta');
      return res.redirect('/tv/login');
    }
    if (!user.ativo) {
      req.flash('error', 'Usuario TV inativo');
      return res.redirect('/tv/login');
    }

    req.session.user = {
      _id: user._id.toString(),
      nome: user.nome,
      email: user.email,
      role: 'tv',
      adegaId: user.adegaId ? user.adegaId.toString() : null,
    };

    req.session.save((err) => {
      if (err) {
        req.flash('error', 'Erro ao criar sessao');
        return res.redirect('/tv/login');
      }
      res.redirect('/player-tv');
    });
  } catch (err) {
    req.flash('error', 'Erro ao autenticar: ' + err.message);
    res.redirect('/tv/login');
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    const users = await User.find({ adegaId: req.adegaId }).select('-senha');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
