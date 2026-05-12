const { Router } = require('express');
const youtubeService = require('../services/youtubeService');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticateAPI);

// Middleware to load youtube config once per request (falls back to system-level)
router.use(async (req, res, next) => {
  if (!req.adegaId) return next();
  try {
    const Adega = require('../models/Adega');
    const configLoader = require('../services/configLoader');
    const adega = await Adega.findById(req.adegaId).select('youtubeConfig').lean();
    const cfg = adega ? adega.youtubeConfig : { mock: true };
    // Fallback to system-level credentials if adega has none
    if (!cfg.clientId && !cfg.clientSecret) {
      const sys = configLoader.getConfig();
      if (sys?.youtubeClientId || sys?.youtubeClientSecret || sys?.youtubeApiKey) {
        cfg.clientId = cfg.clientId || sys.youtubeClientId;
        cfg.clientSecret = cfg.clientSecret || sys.youtubeClientSecret;
        cfg.apiKey = cfg.apiKey || sys.youtubeApiKey;
        if (sys.youtubeClientId) cfg.mock = false;
      }
    }
    req.youtubeConfig = cfg;
  } catch {
    req.youtubeConfig = { mock: true };
  }
  next();
});

router.post('/upload', authorize('admin'), async (req, res) => {
  try {
    const { titulo, descricao, visibility } = req.body;
    const video = await youtubeService.uploadVideo(titulo, descricao, null, visibility, req.youtubeConfig);
    res.json({ video });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/playlist', authorize('admin'), async (req, res) => {
  try {
    const { titulo, descricao, visibility } = req.body;
    const cfg = req.youtubeConfig;
    const playlist = await youtubeService.criarPlaylist(titulo, descricao, visibility, cfg);
    res.json({ playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/adicionar-video', authorize('admin'), async (req, res) => {
  try {
    const { videoId, playlistId } = req.body;
    const item = await youtubeService.adicionarVideoPlaylist(videoId, playlistId, req.youtubeConfig);
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/playlists', async (req, res) => {
  try {
    const playlists = await youtubeService.listarPlaylists(req.youtubeConfig);
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/videos', async (req, res) => {
  try {
    const videos = await youtubeService.listarVideos(req.youtubeConfig);
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lives', authorize('admin'), async (req, res) => {
  try {
    const { titulo, descricao, dataInicio } = req.body;
    const live = await youtubeService.criarLive(titulo, descricao, dataInicio, req.youtubeConfig);
    res.json({ live });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lives/atualizar-status', authorize('admin'), async (req, res) => {
  try {
    const { broadcastId, status } = req.body;
    const result = await youtubeService.atualizarStatusLive(broadcastId, status, req.youtubeConfig);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
