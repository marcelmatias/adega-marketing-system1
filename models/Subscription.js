const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  adegaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adega', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  status: {
    type: String,
    enum: ['ativo', 'cancelado', 'expirado', 'trial', 'pendente'],
    default: 'trial',
  },
  ciclo: { type: String, enum: ['mensal', 'anual'], default: 'mensal' },
  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  canceledAt: { type: Date },
  trialEndsAt: { type: Date },
  modulosLiberados: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

subscriptionSchema.index({ adegaId: 1, status: 1 });
subscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
