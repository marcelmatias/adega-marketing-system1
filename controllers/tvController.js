const Campaign = require('../models/Campaign');
const Adega = require('../models/Adega');
const youtubeService = require('../services/youtubeService');

exports.playlistTV = async (req, res) => {
  try {
    const adegaId = req.adegaId;
    if (!adegaId) return res.status(400).json({ error: 'adegaId nao identificado' });

    const filter = { adegaId, status: 'publicado', urlYoutube: { $ne: '' } };
    const campanhas = await Campaign.find(filter)
      .populate('produtoId', 'nome preco imagem categoria descricao unidade')
      .sort({ dataPublicacao: -1 })
      .limit(50);

    if (campanhas.length === 0) {
      return res.json({ campanhas: [], playlistUrl: null, mensagem: 'Nenhuma campanha publicada' });
    }

    const playlistId = campanhas.find(c => c.playlistId)?.playlistId ||
      (await Adega.findById(campanhas[0].adegaId))?.youtubeConfig?.playlistId;

    let playlistUrl = null;
    if (playlistId) {
      playlistUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&loop=1`;
    }

    const adega = await Adega.findById(adegaId).select('nome logo endereco').lean();

    res.json({ campanhas, playlistUrl, total: campanhas.length, adega });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.playlistTVAtiva = async (req, res) => {
  try {
    const adegaId = req.adegaId;
    if (!adegaId) return res.status(400).json({ error: 'adegaId nao identificado' });

    const filter = { adegaId, ativoNaTV: true };
    const campanhas = await Campaign.find(filter)
      .populate('produtoId', 'nome preco imagem categoria descricao unidade')
      .sort({ updatedAt: -1 });

    const adega = await Adega.findById(adegaId).select('nome logo endereco').lean();

    res.json({ campanhas, total: campanhas.length, adega });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.statusTV = async (req, res) => {
  try {
    const adegaId = req.adegaId;
    if (!adegaId) return res.status(400).json({ error: 'adegaId nao identificado' });

    const totalPublicadas = await Campaign.countDocuments({ adegaId, status: 'publicado', urlYoutube: { $ne: '' } });
    const totalAtivas = await Campaign.countDocuments({ adegaId, ativoNaTV: true });
    const ultima = await Campaign.findOne({ adegaId, status: 'publicado' }).sort({ dataPublicacao: -1 });
    res.json({
      online: totalPublicadas > 0 || totalAtivas > 0,
      totalCampanhas: totalPublicadas,
      totalAtivasNaTV: totalAtivas,
      ultimaAtualizacao: ultima?.dataPublicacao || null,
      ultimoVideo: ultima?.nome || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
