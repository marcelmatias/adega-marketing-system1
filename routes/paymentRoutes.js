const { Router } = require('express');
const paymentService = require('../services/paymentService');
const asaasService = require('../services/asaasService');
const stripeService = require('../services/stripeService');
const logger = require('../utils/logger');

const router = Router();

// Asaas webhook (PIX)
router.post('/asaas/webhook', async (req, res) => {
  try {
    await paymentService.processarWebhookAsaas(req.body);
    res.status(200).send('OK');
  } catch (err) {
    logger.error(`Erro webhook Asaas: ${err.message}`);
    res.status(200).send('OK');
  }
});

// Stripe webhook (Card) - uses raw body (set in server.js)
router.post('/stripe/webhook', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body?.toString ? req.body.toString() : JSON.stringify(req.body);
    if (sig && rawBody) {
      const event = stripeService.constructWebhookEvent(rawBody, sig);
      if (event) {
        await paymentService.processarWebhookStripe(event);
      }
    } else {
      logger.warn('Stripe webhook recebido sem signature ou body');
    }
    res.status(200).send('OK');
  } catch (err) {
    logger.error(`Erro webhook Stripe: ${err.message}`);
    res.status(200).send('OK');
  }
});

// Legacy Mercado Pago webhook (keep for backward compat)
router.post('/webhook', async (req, res) => {
  try {
    res.status(200).send('OK');
  } catch (err) {
    logger.error(`Erro webhook: ${err.message}`);
    res.status(200).send('OK');
  }
});

module.exports = router;
