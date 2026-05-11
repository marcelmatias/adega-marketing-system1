const { Router } = require('express');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const upload = require('../middlewares/upload');
const {
  uploadMidia, importarYoutubeVideo, removerMidia, reordenarMidias, atualizarDuracao,
  uploadAudio, removerAudio, toggleTV,
} = require('../controllers/mediaController');

const router = Router();

router.use(authenticateAPI);
router.use(tenantMiddleware);
router.use(authorize('admin', 'staff'));

router.post('/:id/midias', upload.single('arquivo'), uploadMidia);
router.post('/:id/youtube-video', importarYoutubeVideo);
router.delete('/:id/midias/:midiaId', removerMidia);
router.put('/:id/midias/reordenar', reordenarMidias);
router.put('/:id/midias/:midiaId/duracao', atualizarDuracao);
router.post('/:id/audio', upload.single('audio'), uploadAudio);
router.delete('/:id/audio', removerAudio);
router.put('/:id/tv-toggle', toggleTV);

module.exports = router;
