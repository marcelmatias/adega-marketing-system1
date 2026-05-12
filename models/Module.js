const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  descricao: { type: String, default: '' },
  descricaoCurta: { type: String, default: '' },
  icone: { type: String, default: 'bi-box' },
  precoMensal: { type: Number, required: true, default: 0 },
  precoAnual: { type: Number, default: 0 },
  ordem: { type: Number, default: 0 },
  destaque: { type: Boolean, default: false },
  ativo: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Module', moduleSchema);
