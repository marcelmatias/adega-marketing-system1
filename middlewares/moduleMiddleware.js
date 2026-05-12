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
  LIVE: 'live',
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
  live: ['/api/live', '/admin/live'],
};

// Cache with TTL
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

async function getModulosLiberados(adegaId) {
  if (!adegaId) return [];

  const cacheKey = `modulos_${adegaId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const planModulos = [];
    const sub = await Subscription.findOne({ adegaId, status: { $in: ['ativo', 'trial'] } })
      .populate('planId')
      .sort({ createdAt: -1 })
      .lean();
    if (sub?.planId?.modulos) {
      planModulos.push(...sub.planId.modulos);
    }

    const modSubs = await ModuleSubscription.find({
      adegaId,
      status: 'ativo',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    }).lean();
    const indModulos = modSubs.map(ms => ms.moduleSlug);

    const todos = [...new Set([...planModulos, ...indModulos])];

    cache.set(cacheKey, { data: todos, ts: Date.now() });
    return todos;
  } catch {
    return [];
  }
}

function invalidateCache(adegaId) {
  if (adegaId) {
    cache.delete(`modulos_${adegaId}`);
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

module.exports = { moduleAccess, getModulosLiberados, invalidateCache, MODULOS, MODULO_ROTAS };
