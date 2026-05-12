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
  gateway: { type: String, enum: ['asaas', 'stripe', 'mercadopago', 'manual', 'mock'], default: 'mock' },
  gatewayId: { type: String, default: '' },
  gatewayCustomerId: { type: String, default: '' },
  ciclo: { type: String, enum: ['mensal', 'anual'], default: 'mensal' },
  metodo: { type: String, default: '' },
  parcelas: { type: Number, default: 1 },
  pixCopiaECola: { type: String, default: '' },
  pixQrCode: { type: String, default: '' },
  checkoutUrl: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  pagoEm: { type: Date },
}, { timestamps: true });

paymentSchema.index({ adegaId: 1, status: 1 });
paymentSchema.index({ adegaId: 1, createdAt: -1 });
paymentSchema.index({ gatewayId: 1 }, { sparse: true });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
