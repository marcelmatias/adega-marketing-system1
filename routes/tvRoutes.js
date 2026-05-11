const { Router } = require('express');
const { playlistTV, playlistTVAtiva, statusTV } = require('../controllers/tvController');

const router = Router();

router.get('/playlist', playlistTV);
router.get('/playlist-ativa', playlistTVAtiva);
router.get('/status', statusTV);

module.exports = router;
