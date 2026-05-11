const { Router } = require('express');
const canvaService = require('../services/canvaService');
const Adega = require('../models/Adega');
const { authenticateAPI, authorize } = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticateAPI);

async function getCanvaConfig(req) {
  try {
    const adega = await Adega.findById(req.adegaId);
    return adega ? adega.canvaConfig : null;
  } catch { return null; }
}

router.post('/criar-design', authorize('admin'), async (req, res) => {
  try {
    const { titulo, tipo } = req.body;
    const cfg = await getCanvaConfig(req);
    const design = await canvaService.criarDesign(titulo, tipo || 'video', cfg);
    res.json({ design });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/exportar/:designId', authorize('admin'), async (req, res) => {
  try {
    const cfg = await getCanvaConfig(req);
    const result = await canvaService.exportarDesign(req.params.designId, req.body.formato || 'mp4', cfg);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/designs', authorize('admin'), async (req, res) => {
  try {
    const cfg = await getCanvaConfig(req);
    const designs = await canvaService.listarDesigns(req.query.pastaId, cfg);
    res.json({ designs: designs.designs || [], total: designs.total || 0, mock: cfg?.mock !== false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
