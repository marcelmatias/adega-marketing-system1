const { Router } = require('express');
const youtubeService = require('../services/youtubeService');
const Adega = require('../models/Adega');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticateAPI);

async function getYouTubeConfig(req) {
  try {
    const adega = await Adega.findById(req.adegaId);
    return adega ? adega.youtubeConfig : null;
  } catch { return null; }
}

router.post('/upload', authorize('admin'), async (req, res) => {
  try {
    const { titulo, descricao, visibility } = req.body;
    const cfg = await getYouTubeConfig(req);
    const video = await youtubeService.uploadVideo(titulo, descricao, null, visibility, cfg);
    res.json({ video });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/playlist', authorize('admin'), async (req, res) => {
  try {
    const { titulo, descricao, visibility } = req.body;
    const cfg = await getYouTubeConfig(req);
    const playlist = await youtubeService.criarPlaylist(titulo, descricao, visibility, cfg);
    res.json({ playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/playlist/:playlistId/video/:videoId', authorize('admin'), async (req, res) => {
  try {
    const cfg = await getYouTubeConfig(req);
    await youtubeService.adicionarVideoPlaylist(req.params.playlistId, req.params.videoId, cfg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/playlist/:playlistId', async (req, res) => {
  try {
    const cfg = await getYouTubeConfig(req);
    const videos = await youtubeService.listarVideosPlaylist(req.params.playlistId, cfg);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/playlists', async (req, res) => {
  try {
    const cfg = await getYouTubeConfig(req);
    const playlists = await youtubeService.listarPlaylists(cfg);
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/channels', async (req, res) => {
  try {
    const cfg = await getYouTubeConfig(req);
    const channels = await youtubeService.listarCanais(cfg);
    res.json({ channels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
