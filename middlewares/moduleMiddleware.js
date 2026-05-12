const Subscription = require('../models/Subscription');
const ModuleSubscription = require('../models/ModuleSubscription');
const Plan = require('../models/Plan');

const MODULOS = {
  CAMPANHAS: 'campanhas',
  TV: 'tv',
  INSTAGRAM: 'instagram',
  YOUTUBE: 'youtube',
  CANVA: 'canva',
  LOJA: 'loja',
  ESTOQUE: 'estoque',
  CAIXA: 'caixa',
  ENTRADAS_SAIDAS: 'entradas-saidas',
  FINANCEIRO: 'financeiro',
};

const MODULO_ROTAS = {
  campanhas: ['/api/campanhas', '/admin/campanhas', '/api/midias', '/api/canva', '/api/youtube'],
  tv: ['/api/tv', '/player-tv'],
  instagram: ['/api/instagram', '/admin/instagram'],
  youtube: ['/api/youtube', '/auth/youtube'],
  canva: ['/api/canva'],
  loja: [],
  estoque: [],
  caixa: [],
  'entradas-saidas': ['/api/financeiro'],
  financeiro: ['/api/financeiro'],
};

async function getModulosLiberados(adegaId) {
  if (!adegaId) return [];
  try {
    // Modules from plan
    const planModulos = [];
    const sub = await Subscription.findOne({ adegaId, status: { $in: ['ativo', 'trial'] } })
      .populate('planId')
      .sort({ createdAt: -1 });
    if (sub?.planId?.modulos) {
      planModulos.push(...sub.planId.modulos);
    }

    // Modules purchased individually
    const modSubs = await ModuleSubscription.find({
      adegaId,
      status: 'ativo',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });
    const indModulos = modSubs.map(ms => ms.moduleSlug);

    const todos = [...new Set([...planModulos, ...indModulos])];
    return todos;
  } catch {
    return [];
  }
}

function moduleAccess(...modulos) {
  return async (req, res, next) => {
    const adegaId = req.adegaId || req.session?.user?.adegaId;
    if (!adegaId) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(403).json({ error: 'Acesso negado. Nenhuma adega identificada.' });
      }
      req.flash('error', 'Acesso negado.');
      return res.redirect('/admin');
    }

    const liberados = await getModulosLiberados(adegaId);
    const temAcesso = modulos.some(m => liberados.includes(m));

    if (!temAcesso) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(403).json({ error: 'Modulo nao disponivel. Acesse /admin/planos para contratar.' });
      }
      req.flash('error', 'Este modulo nao esta disponivel. <a href="/admin/planos">Ver planos e modulos avulsos</a>');
      return res.redirect('/admin/planos');
    }

    next();
  };
}

module.exports = { moduleAccess, getModulosLiberados, MODULOS, MODULO_ROTAS };
