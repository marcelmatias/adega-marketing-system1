const { Router } = require('express');
const Plan = require('../models/Plan');
const Module = require('../models/Module');
const Subscription = require('../models/Subscription');
const ModuleSubscription = require('../models/ModuleSubscription');
const Payment = require('../models/Payment');
const paymentService = require('../services/paymentService');
const { authenticateAPI, tenantMiddleware } = require('../middlewares/authMiddleware');
const { getModulosLiberados } = require('../middlewares/moduleMiddleware');
const logger = require('../utils/logger');

const router = Router();

router.get('/marketplace', authenticateAPI, tenantMiddleware, async (req, res) => {
  try {
    const [planos, modulosDisponiveis, assinatura, modulosAtivos] = await Promise.all([
      Plan.find({ ativo: true }).sort({ ordem: 1 }),
      Module.find({ ativo: true }).sort({ ordem: 1 }),
      Subscription.findOne({ adegaId: req.adegaId, status: { $in: ['ativo', 'trial'] } })
        .populate('planId').sort({ createdAt: -1 }),
      ModuleSubscription.find({ adegaId: req.adegaId, status: 'ativo' }),
    ]);

    const modulosLiberados = await getModulosLiberados(req.adegaId);

    res.json({
      planos,
      modulos: modulosDisponiveis,
      assinatura,
      modulosAtivos: modulosAtivos.map(m => m.moduleSlug),
      modulosLiberados,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace/assinar-modulo', authenticateAPI, tenantMiddleware, async (req, res) => {
  try {
    const { moduleSlug, ciclo } = req.body;
    const mod = await Module.findOne({ slug: moduleSlug, ativo: true });
    if (!mod) return res.status(404).json({ error: 'Modulo nao encontrado' });

    const preco = ciclo === 'anual' ? mod.precoAnual : mod.precoMensal;

    // Check if already active
    const existente = await ModuleSubscription.findOne({ adegaId: req.adegaId, moduleSlug, status: 'ativo' });
    if (existente) return res.status(400).json({ error: 'Modulo ja esta ativo' });

    const modSub = await ModuleSubscription.create({
      adegaId: req.adegaId,
      moduleSlug,
      ciclo,
      preco,
      status: preco > 0 ? 'pendente' : 'ativo',
      expiresAt: preco > 0 ? new Date(Date.now() + (ciclo === 'anual' ? 365 : 30) * 24 * 60 * 60 * 1000) : null,
    });

    if (preco === 0) {
      return res.json({ redirect: '/admin/planos', modSub: { ...modSub.toObject(), status: 'ativo' } });
    }

    const pagamento = await paymentService.criarPagamento({
      adegaId: req.adegaId,
      valor: preco,
      ciclo,
      descricao: `Modulo ${mod.nome} - ${ciclo === 'anual' ? 'Anual' : 'Mensal'}`,
      pagador: { email: req.user.email, nome: req.user.nome },
      metadata: { moduleSlug, tipo: 'modulo-avulso' },
    });

    if (pagamento.status === 'aprovado') {
      modSub.status = 'ativo';
      modSub.paymentId = pagamento.id;
      await modSub.save();
    }

    res.json({ redirect: '/admin/planos', pagamento, modSub: { _id: modSub._id, status: modSub.status } });
  } catch (err) {
    logger.error(`Erro ao assinar modulo: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace/cancelar-modulo', authenticateAPI, tenantMiddleware, async (req, res) => {
  try {
    const { moduleSlug } = req.body;
    const modSub = await ModuleSubscription.findOne({ adegaId: req.adegaId, moduleSlug, status: 'ativo' });
    if (!modSub) return res.status(404).json({ error: 'Assinatura do modulo nao encontrada' });
    modSub.status = 'cancelado';
    modSub.canceledAt = new Date();
    await modSub.save();
    res.json({ message: `Modulo ${moduleSlug} cancelado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/minhas-assinaturas', authenticateAPI, tenantMiddleware, async (req, res) => {
  try {
    const modulos = await ModuleSubscription.find({ adegaId: req.adegaId }).sort({ createdAt: -1 });
    res.json(modulos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
