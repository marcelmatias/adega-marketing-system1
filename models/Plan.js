const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  descricao: { type: String, default: '' },
  precoMensal: { type: Number, required: true, default: 0 },
  precoAnual: { type: Number, default: 0 },
  modulos: [{ type: String }],
  limites: {
    maxUsuarios: { type: Number, default: 1 },
    maxProdutos: { type: Number, default: 0 },
    maxCampanhas: { type: Number, default: 0 },
    produtosPorPagina: { type: Boolean, default: false },
    suportePrioritario: { type: Boolean, default: false },
    exportarDados: { type: Boolean, default: false },
  },
  destaque: { type: Boolean, default: false },
  ordem: { type: Number, default: 0 },
  ativo: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
