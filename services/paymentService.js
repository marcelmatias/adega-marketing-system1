const logger = require('../utils/logger');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const asaasService = require('./asaasService');
const stripeService = require('./stripeService');

class PaymentService {
  async criarPagamentoPix({ adegaId, subscriptionId, planId, valor, descricao, pagador, metadata }) {
    return asaasService.gerarPix({ adegaId, subscriptionId, planId, valor, descricao, pagador, metadata });
  }

  async criarPagamentoCartao({ adegaId, subscriptionId, planId, valor, descricao, pagador, metadata, successUrl, cancelUrl }) {
    return stripeService.criarCheckoutSession({ adegaId, subscriptionId, planId, valor, descricao, pagador, metadata, successUrl, cancelUrl });
  }

  async processarWebhookAsaas(event) {
    await asaasService.processarWebhook(event);
  }

  async processarWebhookStripe(event) {
    await stripeService.processarWebhook(event);
  }

  async verificarStatusAssinatura(adegaId) {
    const sub = await Subscription.findOne({ adegaId, status: { $in: ['ativo', 'trial'] } })
      .populate('planId')
      .sort({ createdAt: -1 });

    if (!sub) return { ativo: false, plano: null, trial: false };

    const agora = new Date();
    const expirado = sub.expiresAt && sub.expiresAt < agora;
    const trialExpirado = sub.trialEndsAt && sub.trialEndsAt < agora && sub.status === 'trial';

    if (expirado || trialExpirado) {
      sub.status = 'expirado';
      await sub.save();
      return { ativo: false, plano: sub.planId, trial: sub.status === 'trial' };
    }

    return {
      ativo: true,
      plano: sub.planId,
      trial: sub.status === 'trial',
      expiresAt: sub.expiresAt,
      trialEndsAt: sub.trialEndsAt,
    };
  }
}

module.exports = new PaymentService();
