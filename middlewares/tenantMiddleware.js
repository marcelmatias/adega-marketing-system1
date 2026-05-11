const mongoose = require('mongoose');

const tenantMiddleware = (req, res, next) => {
  const raw = req.user?.adegaId?._id || req.user?.adegaId || req.session?.user?.adegaId || req.headers['x-adega-id'];
  if (!raw) {
    return res.status(400).json({ error: 'Adega nao identificada' });
  }
  req.adegaId = typeof raw === 'string' ? new mongoose.Types.ObjectId(raw) : raw;
  req.tenantFilter = { adegaId: req.adegaId };
  next();
};

module.exports = { tenantMiddleware };
