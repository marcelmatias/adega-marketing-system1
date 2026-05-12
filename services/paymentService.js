const axios = require('axios');
const logger = require('../utils/logger');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

const MERCADO_PAGO_API = 'https://api.mercadopago.com/v1';

class PaymentService {
  constructor() {
    this.accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
    this.mock = !this.accessToken;
  }

  setAccessToken(token) {
    this.accessToken = token;
    this.mock = !token;
  }

  async criarPagamento({ adegaId, subscriptionId, planId, valor, ciclo, descricao, pagador }) {
    if (this.mock) {
      const payment = await Payment.create({
        adegaId, subscriptionId, planId, valor, ciclo,
        status: 'aprovado',
        gateway: 'mock',
        metodo: 'simulado',
        pagoEm: new Date(),
        metadata: { descricao, mock: true },
      });
      logger.info(`[PAGAMENTO MOCK] Pagamento aprovado: ${valor} - ${descricao}`);
      return { id: payment._id, status: 'aprovado', mock: true, gatewayId: `mock_${payment._id}` };
    }

    try {
      const payload = {
        transaction_amount: valor,
        description: descricao,
        payment_method_id: 'pix',
        payer: { email: pagador.email, first_name: pagador.nome },
        notification_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/pagamentos/webhook`,
      };

      const { data } = await axios.post(`${MERCADO_PAGO_API}/payments`, payload, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const payment = await Payment.create({
        adegaId, subscriptionId, planId, valor, ciclo,
        status: data.status === 'approved' ? 'aprovado' : 'pendente',
        gateway: 'mercadopago',
        gatewayId: String(data.id),
        metodo: data.payment_method_id,
        parcelas: data.installments,
        metadata: { descricao, mpResponse: data },
        pagoEm: data.status === 'approved' ? new Date() : null,
      });

      return {
        id: payment._id,
        gatewayId: String(data.id),
        status: data.status,
        qrCode: data.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: data.point_of_interaction?.transaction_data?.ticket_url,
      };
    } catch (err) {
      logger.error(`Erro ao criar pagamento Mercado Pago: ${err.message}`);
      throw new Error('Falha ao processar pagamento');
    }
  }

  async processarWebhook(event) {
    if (this.mock) return;
    try {
      const paymentId = event.data?.id;
      if (!paymentId) return;

      const { data } = await axios.get(`${MERCADO_PAGO_API}/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const payment = await Payment.findOne({ gatewayId: String(paymentId) });
      if (!payment) return;

      const novoStatus = data.status === 'approved' ? 'aprovado' : data.status === 'rejected' ? 'recusado' : payment.status;
      payment.status = novoStatus;
      payment.pagoEm = data.status === 'approved' ? new Date() : payment.pagoEm;
      payment.metadata = { ...payment.metadata, mpAtualizacao: data };
      await payment.save();

      if (novoStatus === 'aprovado' && payment.subscriptionId) {
        await Subscription.findByIdAndUpdate(payment.subscriptionId, { status: 'ativo' });
      }
    } catch (err) {
      logger.error(`Erro webhook Mercado Pago: ${err.message}`);
    }
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
