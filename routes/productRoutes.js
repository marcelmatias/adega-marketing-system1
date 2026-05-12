const { Router } = require('express');
const { listar, buscarPorId, criar, atualizar, remover, estoqueBaixo, atualizarEstoque, exportarCSV, exportarPDF } = require('../controllers/productController');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const { moduleAccess } = require('../middlewares/moduleMiddleware');

const router = Router();

router.use(authenticateAPI);
router.use(tenantMiddleware);

router.get('/', listar);
router.get('/estoque-baixo', estoqueBaixo);
router.get('/exportar/csv', authorize('admin', 'staff'), moduleAccess('loja'), exportarCSV);
router.get('/exportar/pdf', authorize('admin', 'staff'), moduleAccess('loja'), exportarPDF);
router.get('/:id', buscarPorId);
router.post('/', authorize('admin', 'staff'), criar);
router.put('/:id', authorize('admin', 'staff'), atualizar);
router.delete('/:id', authorize('admin'), remover);
router.patch('/:id/estoque', authorize('admin', 'staff'), atualizarEstoque);

module.exports = router;
