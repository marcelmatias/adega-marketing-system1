const { Router } = require('express');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const superController = require('../controllers/superController');

const router = Router();

router.use(authenticateAPI);
router.use(authorize('superadmin'));

router.get('/dashboard', superController.dashboard);
router.get('/adegas', superController.listarAdegas);
router.get('/adegas/:id', superController.detalheAdega);
router.post('/adegas/:id/toggle', superController.alternarStatusAdega);
router.get('/usuarios', superController.listarUsuarios);
router.put('/usuarios/:id', superController.atualizarUsuario);
router.get('/config', superController.getConfig);
router.put('/config', superController.saveConfig);
router.post('/sync-apps', superController.syncAppsToAllAdegas);
router.get('/pagamentos', superController.listarPagamentos);

module.exports = router;
