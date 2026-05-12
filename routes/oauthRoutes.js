const { Router } = require('express');
const youtubeService = require('../services/youtubeService');
const instagramService = require('../services/instagramService');
const Adega = require('../models/Adega');
const logger = require('../utils/logger');

function getBaseUrl(req, adega) {
  if (adega?.sistemaConfig?.baseUrl) {
    return adega.sistemaConfig.baseUrl.replace(/\/+$/, '');
  }
  if (req.headers['x-forwarded-host']) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    return `${proto}://${req.headers['x-forwarded-host']}`;
  }
  return `${req.protocol}://${req.get('host')}`;
}

const router = Router();

router.get('/youtube', async (req, res) => {
  try {
    let adegaConfig = null;
    if (req.session.user && req.session.user.adegaId) {
      const adega = await Adega.findById(req.session.user.adegaId);
      if (adega) adegaConfig = adega.youtubeConfig;
    }
    const url = youtubeService.getAuthUrl(req.session, adegaConfig);
    res.redirect(url);
  } catch (err) {
    logger.error(`Erro ao iniciar OAuth YouTube: ${err.message}`);
    res.redirect('/admin/configuracoes?error=oauth_falhou');
  }
});

router.get('/youtube/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      logger.warn(`OAuth YouTube negado: ${error}`);
      return res.redirect('/admin/configuracoes?error=oauth_negado');
    }
    if (!code || !state) {
      return res.redirect('/admin/configuracoes?error=oauth_invalido');
    }

    const tokens = await youtubeService.handleCallback(code, state, req.session);

    if (!req.session.user || !req.session.user.adegaId) {
      return res.redirect('/admin/configuracoes?error=oauth_sessao');
    }

    const adega = await Adega.findById(req.session.user.adegaId);
    if (!adega) {
      return res.redirect('/admin/configuracoes?error=oauth_adega_nao_encontrada');
    }

    adega.youtubeConfig.refreshToken = tokens.refresh_token;
    adega.youtubeConfig.mock = false;
    await adega.save();

    youtubeService.setAdegaConfig(adega.youtubeConfig);

    logger.info(`YouTube OAuth concluido para adega: ${adega.nome}`);
    res.redirect('/admin/configuracoes?success=oauth_ok');
  } catch (err) {
    logger.error(`Erro callback OAuth YouTube: ${err.message}`);
    res.redirect('/admin/configuracoes?error=oauth_erro');
  }
});

router.get('/instagram', async (req, res) => {
  try {
    let adegaConfig = null;
    let adega = null;
    if (req.session.user && req.session.user.adegaId) {
      adega = await Adega.findById(req.session.user.adegaId);
      if (adega) {
        adegaConfig = {
          ...adega.instagramConfig.toObject(),
          redirectUri: getBaseUrl(req, adega),
        };
      }
    }
    if (!adegaConfig || !adegaConfig.facebookAppId) {
      return res.redirect('/admin/configuracoes?error=ig_sem_app');
    }
    const state = req.session.id;
    const url = instagramService.getAuthUrl(adegaConfig, state);
    res.redirect(url);
  } catch (err) {
    logger.error(`Erro ao iniciar OAuth Instagram: ${err.message}`);
    res.redirect('/admin/configuracoes?error=ig_oauth_falhou');
  }
});

router.get('/instagram/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      logger.warn(`OAuth Instagram negado: ${error}`);
      return res.redirect('/admin/configuracoes?error=ig_oauth_negado');
    }
    if (!code || !state) {
      return res.redirect('/admin/configuracoes?error=ig_oauth_invalido');
    }

    if (!req.session.user || !req.session.user.adegaId) {
      return res.redirect('/admin/configuracoes?error=ig_oauth_sessao');
    }

    const adega = await Adega.findById(req.session.user.adegaId);
    if (!adega) {
      return res.redirect('/admin/configuracoes?error=ig_oauth_adega');
    }

    const config = {
      ...adega.instagramConfig.toObject(),
      redirectUri: getBaseUrl(req, adega),
    };
    const result = await instagramService.handleCallback(code, config);

    adega.instagramConfig.accessToken = result.accessToken;
    adega.instagramConfig.igUserId = result.igUserId;
    adega.instagramConfig.tokenExpiresAt = result.tokenExpiresAt;
    adega.instagramConfig.mock = false;
    await adega.save();

    instagramService.setAdegaConfig(adega.instagramConfig);

    logger.info(`Instagram OAuth concluido para adega: ${adega.nome}`);
    res.redirect('/admin/configuracoes?success=ig_oauth_ok');
  } catch (err) {
    logger.error(`Erro callback OAuth Instagram: ${err.message}`);
    res.redirect(`/admin/configuracoes?error=ig_oauth_erro&detail=${encodeURIComponent(err.message)}`);
  }
});

module.exports = router;
