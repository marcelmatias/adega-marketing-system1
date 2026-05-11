const mongoose = require('mongoose');

const instagramPostSchema = new mongoose.Schema({
  adegaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adega', required: true, index: true },
  instagramPostId: { type: String, default: '' },
  tipo: { type: String, enum: ['IMAGE', 'VIDEO', 'REELS', 'CAROUSEL'], default: 'IMAGE' },
  midiaUrl: { type: String, default: '' },
  legenda: { type: String, default: '' },
  permalink: { type: String, default: '' },
  status: { type: String, enum: ['criado', 'publicado', 'simulado', 'erro'], default: 'criado' },
  campanhaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  publicadoEm: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('InstagramPost', instagramPostSchema);
