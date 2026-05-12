const { Router } = require('express');
const { listar, buscarPorId, criar, atualizar, remover, criarDesignCanva, publicarYouTube, paraTV, paraTVAtiva } = require('../controllers/campaignController');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const { moduleAccess } = require('../middlewares/moduleMiddleware');

const router = Router();

router.use(authenticateAPI);
router.use(tenantMiddleware);
router.use(moduleAccess('campanhas'));

router.get('/', listar);
router.get('/para-tv', paraTV);
router.get('/para-tv-ativa', paraTVAtiva);
router.get('/:id', buscarPorId);
router.post('/', authorize('admin', 'staff'), criar);
router.put('/:id', authorize('admin', 'staff'), atualizar);
router.delete('/:id', authorize('admin'), remover);
router.post('/:id/design-canva', authorize('admin'), criarDesignCanva);
router.post('/:id/publicar-youtube', authorize('admin'), publicarYouTube);

module.exports = router;
