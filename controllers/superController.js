const Adega = require('../models/Adega');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Module = require('../models/Module');
const Subscription = require('../models/Subscription');
const ModuleSubscription = require('../models/ModuleSubscription');
const Payment = require('../models/Payment');
const SystemConfig = require('../models/SystemConfig');
const configLoader = require('../services/configLoader');
const logger = require('../utils/logger');

exports.dashboard = async (req, res) => {
  try {
    const [totalAdegas, totalUsuarios, totalPlanos, totalPagamentos, pagamentosRecentes, adegasAtivas] = await Promise.all([
      Adega.countDocuments(),
      User.countDocuments(),
      Plan.countDocuments({ ativo: true }),
      Payment.countDocuments(),
      Payment.find().sort({ createdAt: -1 }).limit(5).populate('adegaId', 'nome'),
      Adega.countDocuments({ ativo: true }),
    ]);
    res.json({ totalAdegas, totalUsuarios, totalPlanos, totalPagamentos, pagamentosRecentes, adegasAtivas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarAdegas = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.ativo !== undefined) filter.ativo = req.query.ativo === 'true';
    const [adegas, total] = await Promise.all([
      Adega.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select('nome logo endereco whatsapp telefone email ativo createdAt'),
      Adega.countDocuments(filter),
    ]);
    res.json({ adegas, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.detalheAdega = async (req, res) => {
  try {
    const adega = await Adega.findById(req.params.id);
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    const [users, sub, modSubs, pagamentos] = await Promise.all([
      User.find({ adegaId: adega._id }).select('-senha'),
      Subscription.findOne({ adegaId: adega._id }).populate('planId').sort({ createdAt: -1 }),
      ModuleSubscription.find({ adegaId: adega._id }).sort({ createdAt: -1 }),
      Payment.find({ adegaId: adega._id }).sort({ createdAt: -1 }).limit(20),
    ]);
    res.json({ adega, users, subscription: sub, modulos: modSubs, pagamentos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.alternarStatusAdega = async (req, res) => {
  try {
    const adega = await Adega.findById(req.params.id);
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    adega.ativo = !adega.ativo;
    await adega.save();
    res.json({ ativo: adega.ativo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.adegaId) filter.adegaId = req.query.adegaId;
    const [users, total] = await Promise.all([
      User.find(filter).select('-senha').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.atualizarUsuario = async (req, res) => {
  try {
    const { nome, email, role, ativo } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    if (nome !== undefined) user.nome = nome;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (ativo !== undefined) user.ativo = ativo;
    await user.save();
    res.json(user.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConfig = async (req, res) => {
  try {
    const config = configLoader.getConfig() || await SystemConfig.findOne().sort({ createdAt: -1 });
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveConfig = async (req, res) => {
  try {
    let config = configLoader.getConfig() || await SystemConfig.findOne().sort({ createdAt: -1 });
    if (!config) {
      config = new SystemConfig();
    }
    const campos = [
      'baseUrl', 'systemName',
      'asaasApiKey', 'asaasEnvironment',
      'stripeSecretKey', 'stripePublishableKey', 'stripeWebhookSecret',
      'youtubeClientId', 'youtubeClientSecret', 'youtubeApiKey',
      'canvaApiKey', 'canvaApiSecret',
      'instagramFacebookAppId', 'instagramFacebookAppSecret',
      'mercadoPagoAccessToken',
      'googleClientId', 'googleClientSecret',
      'facebookAppId', 'facebookAppSecret',
      'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'emailFrom',
      'manutencao', 'manutencaoMensagem',
      'permitirCadastro', 'trialDays',
    ];
    campos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        config[campo] = req.body[campo];
      }
    });
    await config.save();
    configLoader.setConfig(config);
    logger.info('Configuracao do sistema atualizada');
    res.json({ message: 'Configuracao salva', config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.syncAppsToAllAdegas = async (req, res) => {
  try {
    const config = configLoader.getConfig();
    if (!config) return res.status(400).json({ error: 'Configuracao nao carregada' });

    const update = {};
    if (config.youtubeClientId) { update['youtubeConfig.clientId'] = config.youtubeClientId; update['youtubeConfig.mock'] = false; }
    if (config.youtubeClientSecret) update['youtubeConfig.clientSecret'] = config.youtubeClientSecret;
    if (config.youtubeApiKey) update['youtubeConfig.apiKey'] = config.youtubeApiKey;
    if (config.canvaApiKey) { update['canvaConfig.apiKey'] = config.canvaApiKey; update['canvaConfig.mock'] = false; }
    if (config.canvaApiSecret) update['canvaConfig.apiSecret'] = config.canvaApiSecret;
    if (config.instagramFacebookAppId) { update['instagramConfig.facebookAppId'] = config.instagramFacebookAppId; update['instagramConfig.mock'] = false; }
    if (config.instagramFacebookAppSecret) update['instagramConfig.facebookAppSecret'] = config.instagramFacebookAppSecret;

    if (Object.keys(update).length === 0) {
      return res.json({ message: 'Nenhuma credencial configurada para sincronizar', adegasAtualizadas: 0 });
    }

    // Only update adegas that have empty fields (non-destructive)
    const conditions = {
      $or: Object.keys(update).map(key => {
        const fieldPath = key.replace(/\./g, '.');
        return { [fieldPath]: { $in: ['', null, undefined] } };
      }),
    };

    const result = await Adega.updateMany(conditions, { $set: update });
    logger.info(`Apps sincronizados: ${result.modifiedCount} adegas atualizadas`);
    res.json({ message: 'Credenciais sincronizadas', adegasAtualizadas: result.modifiedCount });
  } catch (err) {
    logger.error(`Erro sync apps: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.listarPagamentos = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.gateway) filter.gateway = req.query.gateway;
    const [pagamentos, total] = await Promise.all([
      Payment.find(filter)
        .populate('adegaId', 'nome')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);
    res.json({ pagamentos, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
