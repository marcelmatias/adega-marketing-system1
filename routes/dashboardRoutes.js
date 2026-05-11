const { Router } = require('express');
const { index } = require('../controllers/dashboardController');
const { authenticateAPI } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

const router = Router();

router.use(authenticateAPI);
router.use(tenantMiddleware);

router.get('/', index);

module.exports = router;
