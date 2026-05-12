const { Router } = require('express');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const paymentService = require('../services/paymentService');
const { authenticateAPI, authorize, authenticateView } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const { invalidateCache } = require('../middlewares/moduleMiddleware');
const logger = require('../utils/logger');

const router = Router();

router.get('/planos', async (req, res) => {
  try {
    const planos = await Plan.find({ ativo: true }).sort({ ordem: 1 });
    let assinatura = null;
    if (req.session?.user?.adegaId) {
      assinatura = await Subscription.findOne({ adegaId: req.session.user.adegaId, status: { $in: ['ativo', 'trial'] } })
        .populate('planId')
        .sort({ createdAt: -1 });
    }
    res.json({ planos, assinatura });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscriptions/selecionar', authenticateAPI, tenantMiddleware, async (req, res) => {
  try {
    const { planId, ciclo, gateway } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plano nao encontrado' });

    const valor = ciclo === 'anual' ? plan.precoAnual : plan.precoMensal;
    const metodoPagamento = gateway || 'pix';

    let sub = await Subscription.findOne({ adegaId: req.adegaId, status: { $in: ['ativo', 'trial'] } });
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (sub) {
      sub.planId = plan._id;
      sub.ciclo = ciclo;
      sub.modulosLiberados = plan.modulos;
      sub.status = 'pendente';
      await sub.save();
    } else {
      sub = await Subscription.create({
        adegaId: req.adegaId,
        planId: plan._id,
        ciclo,
        status: valor > 0 ? 'pendente' : 'ativo',
        trialEndsAt: valor > 0 ? trialEndsAt : null,
        expiresAt: valor > 0 ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        modulosLiberados: plan.modulos,
      });
    }

    invalidateCache(req.adegaId);

    if (valor === 0) {
      return res.json({ redirect: '/admin', sub: { _id: sub._id, status: 'ativo' } });
    }

    let pagamento;
    if (metodoPagamento === 'card') {
      pagamento = await paymentService.criarPagamentoCartao({
        adegaId: req.adegaId,
        subscriptionId: sub._id,
        planId: plan._id,
        valor,
        descricao: `Plano ${plan.nome} - ${ciclo === 'anual' ? 'Anual' : 'Mensal'}`,
        pagador: { email: req.user.email, nome: req.user.nome },
        successUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/admin/planos?success=1`,
        cancelUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/admin/planos?canceled=1`,
      });
    } else {
      pagamento = await paymentService.criarPagamentoPix({
        adegaId: req.adegaId,
        subscriptionId: sub._id,
        planId: plan._id,
        valor,
        descricao: `Plano ${plan.nome} - ${ciclo === 'anual' ? 'Anual' : 'Mensal'}`,
        pagador: { email: req.user.email, nome: req.user.nome },
      });
    }

    res.json({ redirect: '/admin/planos', pagamento, sub: { _id: sub._id, status: sub.status } });
  } catch (err) {
    logger.error(`Erro ao selecionar plano: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscriptions/cancelar', authenticateAPI, tenantMiddleware, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ adegaId: req.adegaId, status: 'ativo' });
    if (!sub) return res.status(404).json({ error: 'Nenhuma assinatura ativa' });
    sub.status = 'cancelado';
    sub.canceledAt = new Date();
    await sub.save();
    invalidateCache(req.adegaId);
    res.json({ message: 'Assinatura cancelada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/assinatura', authenticateAPI, tenantMiddleware, async (req, res) => {
  try {
    const status = await paymentService.verificarStatusAssinatura(req.adegaId);
    const historico = await Payment.find({ adegaId: req.adegaId }).sort({ createdAt: -1 }).limit(10);
    res.json({ ...status, historico });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pagamentos', authenticateAPI, tenantMiddleware, async (req, res) => {
  try {
    const pagamentos = await Payment.find({ adegaId: req.adegaId }).sort({ createdAt: -1 });
    res.json(pagamentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
