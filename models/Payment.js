const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  adegaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adega', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  valor: { type: Number, required: true },
  moeda: { type: String, default: 'BRL' },
  status: {
    type: String,
    enum: ['pendente', 'aprovado', 'recusado', 'cancelado', 'estornado'],
    default: 'pendente',
  },
  gateway: { type: String, enum: ['mercadopago', 'manual', 'mock'], default: 'mock' },
  gatewayId: { type: String, default: '' },
  ciclo: { type: String, enum: ['mensal', 'anual'], default: 'mensal' },
  metodo: { type: String, default: '' },
  parcelas: { type: Number, default: 1 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  pagoEm: { type: Date },
}, { timestamps: true });

paymentSchema.index({ adegaId: 1, status: 1 });
paymentSchema.index({ gatewayId: 1 }, { sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
