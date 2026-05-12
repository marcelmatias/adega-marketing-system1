const { Router } = require('express');
const passport = require('../config/passport');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google' }),
  (req, res) => {
    req.session.user = { id: req.user._id, adegaId: req.user.adegaId, nome: req.user.nome, email: req.user.email, role: req.user.role };
    res.redirect('/admin');
  }
);

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=facebook' }),
  (req, res) => {
    req.session.user = { id: req.user._id, adegaId: req.user.adegaId, nome: req.user.nome, email: req.user.email, role: req.user.role };
    res.redirect('/admin');
  }
);

module.exports = router;
