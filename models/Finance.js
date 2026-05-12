const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  adegaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adega', required: true, index: true },
  tipo: { type: String, enum: ['receita', 'despesa'], required: true },
  categoria: { type: String, required: true },
  descricao: { type: String, required: true, trim: true },
  valor: { type: Number, required: true, min: 0 },
  data: { type: Date, default: Date.now },
  formaPagamento: { type: String, enum: ['dinheiro', 'credito', 'debito', 'pix', 'boleto', 'transferencia'], default: 'pix' },
  status: { type: String, enum: ['pago', 'pendente', 'cancelado'], default: 'pago' },
  observacao: { type: String, default: '' },
  registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

financeSchema.index({ adegaId: 1, status: 1, data: 1 });
financeSchema.index({ adegaId: 1, categoria: 1 });
financeSchema.index({ adegaId: 1, createdAt: -1 });

module.exports = mongoose.model('Finance', financeSchema);
