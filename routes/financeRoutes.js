const { Router } = require('express');
const { listar, criar, atualizar, remover, fluxoCaixa, relatorioMensal } = require('../controllers/financeController');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

const router = Router();

router.use(authenticateAPI);
router.use(tenantMiddleware);

router.get('/', listar);
router.get('/fluxo-caixa', fluxoCaixa);
router.get('/relatorio-mensal', relatorioMensal);
router.post('/', authorize('admin', 'staff'), criar);
router.put('/:id', authorize('admin'), atualizar);
router.delete('/:id', authorize('admin'), remover);

module.exports = router;
