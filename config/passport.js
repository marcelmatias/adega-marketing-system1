const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const Adega = require('../models/Adega');
const logger = require('../utils/logger');

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const adegaId = req.session?.adegaRegistration || req.session?.user?.adegaId;
      if (!adegaId) return done(null, false, { message: 'Sessao expirada. Inicie o cadastro novamente.' });

      const email = profile.emails?.[0]?.value || `${profile.id}@google.placeholder`;
      let user = await User.findOne({ email });

      if (user) {
        if (String(user.adegaId) !== String(adegaId)) {
          return done(null, false, { message: 'Email ja cadastrado em outra conta.' });
        }
      } else {
        user = await User.create({
          adegaId,
          nome: profile.displayName,
          email,
          senha: `google_${profile.id}_${Date.now()}`,
          role: 'admin',
          socialId: profile.id,
          socialProvider: 'google',
        });
      }

      done(null, user);
    } catch (err) {
      logger.error(`Erro Google Strategy: ${err.message}`);
      done(err);
    }
  }));
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails'],
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const adegaId = req.session?.adegaRegistration || req.session?.user?.adegaId;
      if (!adegaId) return done(null, false, { message: 'Sessao expirada. Inicie o cadastro novamente.' });

      const email = profile.emails?.[0]?.value || `${profile.id}@facebook.placeholder`;
      let user = await User.findOne({ email });

      if (user) {
        if (String(user.adegaId) !== String(adegaId)) {
          return done(null, false, { message: 'Email ja cadastrado em outra conta.' });
        }
      } else {
        user = await User.create({
          adegaId,
          nome: profile.displayName,
          email,
          senha: `facebook_${profile.id}_${Date.now()}`,
          role: 'admin',
          socialId: profile.id,
          socialProvider: 'facebook',
        });
      }

      done(null, user);
    } catch (err) {
      logger.error(`Erro Facebook Strategy: ${err.message}`);
      done(err);
    }
  }));
}

module.exports = passport;
