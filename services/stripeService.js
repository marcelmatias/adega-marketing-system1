const logger = require('../utils/logger');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const ModuleSubscription = require('../models/ModuleSubscription');
const { invalidateCache } = require('../middlewares/moduleMiddleware');

class StripeService {
  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
    this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    this.mock = !this.secretKey;
    this.stripe = null;
  }

  setConfig(secretKey, publishableKey, webhookSecret) {
    this.secretKey = secretKey;
    this.publishableKey = publishableKey;
    this.webhookSecret = webhookSecret;
    this.mock = !secretKey;
    if (!this.mock) {
      this.stripe = this._getStripeInstance();
    }
  }

  _getStripeInstance() {
    try {
      return require('stripe')(this.secretKey);
    } catch (err) {
      logger.warn('Stripe nao disponivel, usando mock');
      return null;
    }
  }

  async criarCheckoutSession({ adegaId, subscriptionId, planId, valor, descricao, pagador, metadata, successUrl, cancelUrl }) {
    if (this.mock || !this.stripe) {
      const payment = await Payment.create({
        adegaId, subscriptionId, planId, valor,
        status: 'pendente',
        gateway: 'mock',
        metodo: 'cartao',
        metadata: { descricao, mock: true, ...metadata },
        checkoutUrl: '#',
      });
      logger.info(`[STRIPE MOCK] Checkout criado: ${valor} - ${descricao}`);
      return {
        id: payment._id,
        status: 'pendente',
        mock: true,
        gatewayId: `mock_${payment._id}`,
        checkoutUrl: null,
        sessionId: `mock_${payment._id}`,
      };
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'brl',
            product_data: { name: descricao },
            unit_amount: Math.round(valor * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl || `${process.env.BASE_URL || 'http://localhost:3000'}/admin/planos?success=1`,
        cancel_url: cancelUrl || `${process.env.BASE_URL || 'http://localhost:3000'}/admin/planos?canceled=1`,
        metadata: {
          adegaId: String(adegaId),
          subscriptionId: String(subscriptionId || ''),
          planId: String(planId || ''),
          ...Object.fromEntries(
            Object.entries(metadata || {}).map(([k, v]) => [k, String(v)])
          ),
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const payment = await Payment.create({
        adegaId, subscriptionId, planId, valor,
        status: 'pendente',
        gateway: 'stripe',
        gatewayId: session.id,
        metodo: 'cartao',
        checkoutUrl: session.url,
        metadata: { descricao, stripeSessionId: session.id, ...metadata },
      });

      return {
        id: payment._id,
        gatewayId: session.id,
        status: 'pendente',
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (err) {
      logger.error(`Erro ao criar sessao Stripe: ${err.message}`);
      throw new Error('Falha ao criar sessao de pagamento');
    }
  }

  async processarWebhook(event) {
    if (this.mock) return;
    try {
      const session = event.data?.object;
      if (!session) return;

      const sessionId = session.id;
      const pagamento = await Payment.findOne({ gatewayId: sessionId });
      if (!pagamento) {
        logger.warn(`Sessao Stripe nao encontrada: ${sessionId}`);
        return;
      }

      if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
        pagamento.status = 'aprovado';
        pagamento.pagoEm = new Date();
        pagamento.metadata = { ...pagamento.metadata, stripeEvent: event.type };
        await pagamento.save();

        if (pagamento.subscriptionId) {
          await Subscription.findByIdAndUpdate(pagamento.subscriptionId, { status: 'ativo' });
        }
        if (pagamento.metadata?.moduleSlug) {
          await ModuleSubscription.findOneAndUpdate(
            { adegaId: pagamento.adegaId, moduleSlug: pagamento.metadata.moduleSlug },
            { status: 'ativo' }
          );
        }
        invalidateCache(pagamento.adegaId);

        logger.info(`Stripe webhook: pagamento ${sessionId} aprovado`);
      }

      if (event.type === 'checkout.session.expired') {
        pagamento.status = 'cancelado';
        await pagamento.save();
        logger.info(`Stripe webhook: sessao ${sessionId} expirada`);
      }
    } catch (err) {
      logger.error(`Erro webhook Stripe: ${err.message}`);
    }
  }

  constructWebhookEvent(payload, signature) {
    if (this.mock || !this.stripe) return null;
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (err) {
      logger.error(`Erro ao construir evento Stripe: ${err.message}`);
      return null;
    }
  }
}

module.exports = new StripeService();
