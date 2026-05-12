const { Router } = require('express');
const { listar, criar, atualizar, remover, fluxoCaixa, relatorioMensal, exportarCSV, exportarPDF } = require('../controllers/financeController');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const { moduleAccess } = require('../middlewares/moduleMiddleware');

const router = Router();

router.use(authenticateAPI);
router.use(tenantMiddleware);

router.get('/', listar);
router.get('/fluxo-caixa', fluxoCaixa);
router.get('/relatorio-mensal', relatorioMensal);
router.get('/exportar/csv', authorize('admin', 'staff'), moduleAccess('financeiro'), exportarCSV);
router.get('/exportar/pdf', authorize('admin', 'staff'), moduleAccess('financeiro'), exportarPDF);
router.post('/', authorize('admin', 'staff'), criar);
router.put('/:id', authorize('admin'), atualizar);
router.delete('/:id', authorize('admin'), remover);

module.exports = router;
