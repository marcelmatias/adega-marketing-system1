const { Router } = require('express');
const { authenticateAPI } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const { playlistTV, playlistTVAtiva, statusTV } = require('../controllers/tvController');

const router = Router();

router.get('/playlist', authenticateAPI, tenantMiddleware, playlistTV);
router.get('/playlist-ativa', authenticateAPI, tenantMiddleware, playlistTVAtiva);
router.get('/status', authenticateAPI, tenantMiddleware, statusTV);

module.exports = router;
