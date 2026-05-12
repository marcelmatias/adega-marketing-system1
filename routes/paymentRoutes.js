const { Router } = require('express');
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

const router = Router();

router.post('/webhook', async (req, res) => {
  try {
    await paymentService.processarWebhook(req.body);
    res.status(200).send('OK');
  } catch (err) {
    logger.error(`Erro webhook: ${err.message}`);
    res.status(200).send('OK');
  }
});

module.exports = router;
