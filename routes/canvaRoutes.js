const { Router } = require('express');
const canvaService = require('../services/canvaService');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticateAPI);

// Middleware to load canva config once per request (falls back to system-level)
router.use(async (req, res, next) => {
  if (!req.adegaId) return next();
  try {
    const Adega = require('../models/Adega');
    const configLoader = require('../services/configLoader');
    const adega = await Adega.findById(req.adegaId).select('canvaConfig').lean();
    const cfg = adega ? adega.canvaConfig : { mock: true };
    // Fallback to system-level credentials if adega has none
    if (!cfg.apiKey && !cfg.apiSecret) {
      const sys = configLoader.getConfig();
      if (sys?.canvaApiKey || sys?.canvaApiSecret) {
        cfg.apiKey = cfg.apiKey || sys.canvaApiKey;
        cfg.apiSecret = cfg.apiSecret || sys.canvaApiSecret;
        if (sys.canvaApiKey) cfg.mock = false;
      }
    }
    req.canvaConfig = cfg;
  } catch {
    req.canvaConfig = { mock: true };
  }
  next();
});

router.post('/criar-design', authorize('admin'), async (req, res) => {
  try {
    const { titulo, tipo } = req.body;
    const design = await canvaService.criarDesign(titulo, tipo || 'video', req.canvaConfig);
    res.json({ design });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/exportar/:designId', authorize('admin'), async (req, res) => {
  try {
    const cfg = req.canvaConfig;
    const resultado = await canvaService.exportarDesign(req.params.designId, cfg);
    res.json({ resultado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:designId', async (req, res) => {
  try {
    const design = await canvaService.obterDesign(req.params.designId, req.canvaConfig);
    res.json({ design });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
