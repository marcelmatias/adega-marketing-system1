const { Router } = require('express');
const { criar, listar, buscarPorId, buscarMe, atualizar, remover } = require('../controllers/adegaController');
const { authenticateAPI, authorize, authenticateView } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

const router = Router();

router.post('/', authenticateAPI, authorize('admin', 'superadmin'), criar);
router.get('/', authenticateAPI, authorize('admin', 'superadmin'), listar);
router.get('/me', authenticateAPI, tenantMiddleware, buscarMe);
router.get('/:id', authenticateAPI, authorize('admin', 'superadmin'), buscarPorId);
router.put('/:id', authenticateAPI, authorize('admin', 'superadmin'), atualizar);
router.delete('/:id', authenticateAPI, authorize('admin', 'superadmin'), remover);

module.exports = router;
