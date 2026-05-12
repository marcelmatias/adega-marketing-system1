const { Router } = require('express');
const passport = require('../config/passport');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sessionLogin } = require('../middlewares/authMiddleware');

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google' }),
  (req, res) => {
    sessionLogin(req, req.user);
    res.redirect('/admin');
  }
);

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=facebook' }),
  (req, res) => {
    sessionLogin(req, req.user);
    res.redirect('/admin');
  }
);

module.exports = router;
