const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { exibir, salvar, criarPlaylist } = require('../controllers/settingsController');
const { authenticateView } = require('../middlewares/authMiddleware');

const logoStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads', 'adega'),
  filename: (req, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`),
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.get('/', authenticateView, exibir);
router.post('/', authenticateView, uploadLogo.single('logo'), salvar);
router.post('/criar-playlist', authenticateView, criarPlaylist);

module.exports = router;
