const { Router } = require('express');
const { criar, listar, buscarPorId, buscarMe, atualizar, remover } = require('../controllers/adegaController');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

const router = Router();

router.post('/', criar);
router.get('/', listar);
router.get('/me', authenticateAPI, tenantMiddleware, buscarMe);
router.get('/:id', buscarPorId);
router.put('/:id', authenticateAPI, authorize('admin'), atualizar);
router.delete('/:id', authenticateAPI, authorize('admin'), remover);

module.exports = router;
