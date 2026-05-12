const mongoose = require('mongoose');

const moduleSubscriptionSchema = new mongoose.Schema({
  adegaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adega', required: true, index: true },
  moduleSlug: { type: String, required: true },
  status: {
    type: String,
    enum: ['ativo', 'cancelado', 'expirado', 'pendente'],
    default: 'ativo',
  },
  ciclo: { type: String, enum: ['mensal', 'anual'], default: 'mensal' },
  preco: { type: Number, required: true },
  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  canceledAt: { type: Date },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
}, { timestamps: true });

moduleSubscriptionSchema.index({ adegaId: 1, moduleSlug: 1 }, { unique: true, partialFilterExpression: { status: 'ativo' } });
moduleSubscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ModuleSubscription', moduleSubscriptionSchema);
