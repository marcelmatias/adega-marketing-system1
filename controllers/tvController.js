const Campaign = require('../models/Campaign');
const Adega = require('../models/Adega');
const youtubeService = require('../services/youtubeService');

exports.playlistTV = async (req, res) => {
  try {
    const { adegaId } = req.query;
    const filter = { status: 'publicado', urlYoutube: { $ne: '' } };
    if (adegaId) filter.adegaId = adegaId;

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

    res.json({ campanhas, playlistUrl, total: campanhas.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.playlistTVAtiva = async (req, res) => {
  try {
    const { adegaId } = req.query;
    const filter = { ativoNaTV: true };
    if (adegaId) filter.adegaId = adegaId;

    const campanhas = await Campaign.find(filter)
      .populate('produtoId', 'nome preco imagem categoria descricao unidade')
      .sort({ updatedAt: -1 });

    res.json({ campanhas, total: campanhas.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.statusTV = async (req, res) => {
  try {
    const totalPublicadas = await Campaign.countDocuments({ status: 'publicado', urlYoutube: { $ne: '' } });
    const totalAtivas = await Campaign.countDocuments({ ativoNaTV: true });
    const ultima = await Campaign.findOne({ status: 'publicado' }).sort({ dataPublicacao: -1 });
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
