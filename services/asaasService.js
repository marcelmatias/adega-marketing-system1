const axios = require('axios');
const logger = require('../utils/logger');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const ModuleSubscription = require('../models/ModuleSubscription');
const Adega = require('../models/Adega');
const { invalidateCache } = require('../middlewares/moduleMiddleware');

class AsaasService {
  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || '';
    this.environment = process.env.ASAAS_ENVIRONMENT || 'sandbox';
    this.mock = !this.apiKey;
    this._api = this._criarApi();
  }

  setConfig(apiKey, environment) {
    this.apiKey = apiKey || '';
    this.environment = environment || 'sandbox';
    this.mock = !this.apiKey;
    this._api = this._criarApi();
  }

  _criarApi() {
    const baseURL = this.environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';
    const https = require('https');
    return axios.create({
      baseURL,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
      httpAgent: new require('http').Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
    });
  }

  get api() { return this._api; }

  async criarOuBuscarCliente(adegaId) {
    const adega = await Adega.findById(adegaId);
    if (!adega) throw new Error('Adega nao encontrada');

    if (adega.asaasCustomerId) {
      return adega.asaasCustomerId;
    }

    if (this.mock) {
      const mockId = `cus_mock_${adega._id}`;
      adega.asaasCustomerId = mockId;
      await adega.save();
      return mockId;
    }

    try {
      const { data } = await this.api.post('/customers', {
        name: adega.nome,
        email: adega.email,
        phone: adega.whatsapp?.replace(/\D/g, ''),
        mobilePhone: adega.whatsapp?.replace(/\D/g, ''),
        address: adega.endereco?.logradouro || '',
        addressNumber: adega.endereco?.numero || '',
        city: adega.endereco?.cidade || '',
        state: adega.endereco?.estado || '',
        zipCode: adega.endereco?.cep?.replace(/\D/g, '') || '',
        notificationDisabled: false,
      });

      adega.asaasCustomerId = data.id;
      await adega.save();
      return data.id;
    } catch (err) {
      logger.error(`Erro ao criar cliente no Asaas: ${err.message}`);
      throw new Error('Falha ao criar cliente no Asaas');
    }
  }

  async gerarPix({ adegaId, subscriptionId, planId, valor, descricao, pagador, metadata }) {
    if (this.mock) {
      const payment = await Payment.create({
        adegaId, subscriptionId, planId, valor,
        status: 'pendente',
        gateway: 'mock',
        metodo: 'pix',
        metadata: { descricao, mock: true, ...metadata },
        pixCopiaECola: '0002010102122610800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        pixQrCode: '',
      });
      logger.info(`[ASAAS MOCK] PIX gerado: ${valor} - ${descricao}`);
      return {
        id: payment._id,
        status: 'pendente',
        mock: true,
        gatewayId: `mock_${payment._id}`,
        pixCopiaECola: payment.pixCopiaECola,
        pixQrCode: '',
        adegaId,
      };
    }

    try {
      const customerId = await this.criarOuBuscarCliente(adegaId);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      const { data: charge } = await this.api.post('/payments', {
        customer: customerId,
        billingType: 'PIX',
        value: valor,
        dueDate: dueDate.toISOString().split('T')[0],
        description: descricao.substring(0, 255),
        externalReference: String(adegaId),
      });

      let pixData = { encodedImage: '', payload: '' };
      try {
        const { data: pix } = await this.api.get(`/payments/${charge.id}/pixQrCode`);
        pixData = pix;
      } catch (pixErr) {
        logger.warn(`Erro ao obter QR Code Asaas: ${pixErr.message}`);
      }

      const payment = await Payment.create({
        adegaId, subscriptionId, planId, valor,
        status: charge.status === 'CONFIRMED' ? 'aprovado' : 'pendente',
        gateway: 'asaas',
        gatewayId: charge.id,
        gatewayCustomerId: customerId,
        metodo: 'pix',
        pixCopiaECola: pixData.payload || '',
        pixQrCode: pixData.encodedImage || '',
        metadata: { descricao, ...metadata },
        pagoEm: charge.status === 'CONFIRMED' ? new Date() : null,
      });

      return {
        id: payment._id,
        gatewayId: charge.id,
        status: charge.status === 'CONFIRMED' ? 'aprovado' : 'pendente',
        pixCopiaECola: pixData.payload || '',
        pixQrCode: pixData.encodedImage || '',
        invoiceUrl: charge.invoiceUrl,
        adegaId,
      };
    } catch (err) {
      logger.error(`Erro ao gerar PIX Asaas: ${err.message}`);
      throw new Error('Falha ao gerar cobranca PIX');
    }
  }

  async processarWebhook(event) {
    if (this.mock) return;
    try {
      const { payment, event: eventType } = event;
      if (!payment || !payment.id) return;

      const pagamento = await Payment.findOne({ gatewayId: String(payment.id) });
      if (!pagamento) {
        logger.warn(`Pagamento Asaas nao encontrado: ${payment.id}`);
        return;
      }

      const statusMap = {
        'RECEIVED': 'aprovado',
        'CONFIRMED': 'aprovado',
        'OVERDUE': 'cancelado',
        'REFUNDED': 'estornado',
        'RECEIVED_IN_CASH_UNDONE': 'estornado',
        'REFUND_REQUESTED': 'estornado',
        'CHARGEBACK_REQUESTED': 'estornado',
        'CHARGEBACK_DISPUTE': 'estornado',
        'AWAITING_CHARGEBACK_REVISION': 'pendente',
        'BILLING_SUBSCRIPTION_CANCELED': 'cancelado',
        'SUBSCRIPTION_DELETED': 'cancelado',
      };

      const novoStatus = statusMap[eventType] || pagamento.status;

      if (novoStatus !== pagamento.status) {
        pagamento.status = novoStatus;
        pagamento.pagoEm = ['RECEIVED', 'CONFIRMED'].includes(eventType) ? new Date() : pagamento.pagoEm;
        await pagamento.save();

        if (novoStatus === 'aprovado') {
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
        }

        logger.info(`Asaas webhook: pagamento ${payment.id} atualizado para ${novoStatus}`);
      }
    } catch (err) {
      logger.error(`Erro webhook Asaas: ${err.message}`);
    }
  }

  async consultarCobranca(gatewayId) {
    if (this.mock) return null;
    try {
      const { data } = await this.api.get(`/payments/${gatewayId}`);
      return data;
    } catch (err) {
      logger.error(`Erro ao consultar cobranca Asaas: ${err.message}`);
      return null;
    }
  }
}

module.exports = new AsaasService();
