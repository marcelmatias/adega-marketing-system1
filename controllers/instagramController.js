const InstagramPost = require('../models/InstagramPost');
const Campaign = require('../models/Campaign');
const Product = require('../models/Product');
const Adega = require('../models/Adega');
const instagramService = require('../services/instagramService');
const logger = require('../utils/logger');

exports.testarConexao = async (req, res) => {
  try {
    const adega = await Adega.findById(req.adegaId);
    const result = await instagramService.testarConexao(adega?.instagramConfig);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

exports.status = async (req, res) => {
  try {
    const adega = await Adega.findById(req.adegaId);
    const config = adega?.instagramConfig || {};
    const conectado = !!(config.igUserId && config.accessToken);
    res.json({
      conectado,
      mock: config.mock !== false,
      igUserId: config.igUserId || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      InstagramPost.find({ adegaId: req.adegaId })
        .populate('campanhaId', 'nome')
        .populate('produtoId', 'nome')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InstagramPost.countDocuments({ adegaId: req.adegaId }),
    ]);

    const adega = await Adega.findById(req.adegaId).select('instagramConfig').lean();
    const postsApi = await instagramService.listarPosts(adega?.instagramConfig);

    res.json({ posts, total, page, pages: Math.ceil(total / limit), postsApi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.criarPost = async (req, res) => {
  try {
    const { tipo, midiaUrl, legenda, campanhaId, produtoId } = req.body;

    if (!tipo || !midiaUrl) {
      return res.status(400).json({ error: 'Tipo e URL da midia sao obrigatorios' });
    }
    if (!['IMAGE', 'VIDEO', 'REELS', 'CAROUSEL'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo invalido. Use IMAGE, VIDEO, REELS ou CAROUSEL' });
    }

    const adega = await Adega.findById(req.adegaId);
    const result = await instagramService.criarPost(tipo, midiaUrl, legenda, tipo === 'REELS', adega?.instagramConfig);

    const post = await InstagramPost.create({
      adegaId: req.adegaId,
      instagramPostId: result.id,
      tipo,
      midiaUrl,
      legenda: legenda || '',
      permalink: result.permalink,
      status: result.status,
      campanhaId: campanhaId || null,
      produtoId: produtoId || null,
      publicadoEm: result.status === 'publicado' ? new Date() : null,
    });

    logger.info(`Post Instagram criado: ${post._id}`);
    res.status(201).json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removerPost = async (req, res) => {
  try {
    const post = await InstagramPost.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!post) return res.status(404).json({ error: 'Post nao encontrado' });

    if (post.instagramPostId && !post.instagramPostId.startsWith('mock_')) {
      const adega = await Adega.findById(req.adegaId);
      await instagramService.removerPost(post.instagramPostId, adega?.instagramConfig);
    }

    await InstagramPost.deleteOne({ _id: post._id });
    logger.info(`Post Instagram removido: ${post._id}`);
    res.json({ message: 'Post removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.conteudoDisponivel = async (req, res) => {
  try {
    const campanhas = await Campaign.find({ adegaId: req.adegaId })
      .populate('produtoId', 'nome preco imagem')
      .sort({ createdAt: -1 });

    const produtos = await Product.find({ adegaId: req.adegaId, ativo: true })
      .sort({ nome: 1 });

    const campanhasComMidia = campanhas.filter(c => c.midias && c.midias.length > 0).map(c => {
      const primeiraMidia = c.midias.sort((a, b) => a.ordem - b.ordem)[0];
      return {
        _id: c._id,
        nome: c.nome,
        tipo: c.tipo,
        midiaUrl: primeiraMidia?.arquivo || null,
        produtoNome: c.produtoId?.nome || null,
        created: c.createdAt,
      };
    });

    const produtosComImagem = produtos.filter(p => p.imagem).map(p => ({
      _id: p._id,
      nome: p.nome,
      tipo: 'produto',
      midiaUrl: p.imagem,
      preco: p.preco,
      created: p.createdAt,
    }));

    res.json({ campanhas: campanhasComMidia, produtos: produtosComImagem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
