const { Router } = require('express');
const { login, loginView, loginTv, me, registrar, listarUsuarios } = require('../controllers/authController');
const { authenticateAPI } = require('../middlewares/authMiddleware');

const router = Router();

router.post('/login', login);
router.post('/login-view', loginView);
router.post('/login-tv', loginTv);
router.get('/me', authenticateAPI, me);
router.post('/registrar', registrar);
router.get('/usuarios', authenticateAPI, listarUsuarios);

module.exports = router;
