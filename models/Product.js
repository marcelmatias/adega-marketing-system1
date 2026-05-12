const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  adegaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adega', required: true, index: true },
  nome: { type: String, required: true, trim: true },
  categoria: { type: String, enum: ['cervesa', 'vinho', 'destilado', 'refrigerante', 'agua', 'suco', 'energetico', 'outro'], default: 'outro' },
  preco: { type: Number, required: true, min: 0 },
  custo: { type: Number, default: 0, min: 0 },
  estoque: { type: Number, default: 0, min: 0 },
  estoqueMinimo: { type: Number, default: 10 },
  unidade: { type: String, default: 'un' },
  volume: { type: String, default: '' },
  teorAlcoolico: { type: Number, default: 0 },
  imagem: { type: String, default: '' },
  descricao: { type: String, default: '' },
  ativo: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.virtual('lucroUnitario').get(function () {
  return this.preco - this.custo;
});

productSchema.virtual('margem').get(function () {
  if (this.preco === 0) return 0;
  return ((this.preco - this.custo) / this.preco * 100).toFixed(1);
});

productSchema.index({ adegaId: 1, ativo: 1 });
productSchema.index({ adegaId: 1, categoria: 1, ativo: 1 });
productSchema.index({ adegaId: 1, nome: 1 });

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
