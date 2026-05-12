const { Router } = require('express');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const { moduleAccess } = require('../middlewares/moduleMiddleware');
const { iniciar, parar, status, regenerarSlides } = require('../controllers/liveController');

const router = Router();

router.use(authenticateAPI);
router.use(tenantMiddleware);
router.use(authorize('admin'));
router.use(moduleAccess('live'));

router.post('/iniciar', iniciar);
router.post('/parar', parar);
router.get('/status', status);
router.post('/regenerar', regenerarSlides);

module.exports = router;
