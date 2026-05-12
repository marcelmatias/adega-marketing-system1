const Subscription = require('../models/Subscription');
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
    const sub = await Subscription.findOne({ adegaId, status: { $in: ['ativo', 'trial'] } })
      .populate('planId')
      .sort({ createdAt: -1 });
    if (!sub || !sub.planId) return [];
    return sub.planId.modulos || [];
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
        return res.status(403).json({ error: 'Modulo nao disponivel no seu plano. Acesse /admin/planos para contratar.' });
      }
      req.flash('error', 'Este modulo nao esta disponivel no seu plano. <a href="/admin/planos">Ver planos</a>');
      return res.redirect('/admin');
    }

    next();
  };
}

module.exports = { moduleAccess, getModulosLiberados, MODULOS, MODULO_ROTAS };
