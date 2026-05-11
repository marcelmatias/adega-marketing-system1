const Campaign = require('../models/Campaign');
const Adega = require('../models/Adega');
const canvaService = require('../services/canvaService');
const youtubeService = require('../services/youtubeService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

exports.listar = async (req, res) => {
  try {
    const { status, tipo, page = 1, limit = 20 } = req.query;
    const filter = { adegaId: req.adegaId };
    if (status) filter.status = status;
    if (tipo) filter.tipo = tipo;

    const campanhas = await Campaign.find(filter)
      .populate('produtoId', 'nome categoria')
      .sort({ createdAt: -1 })
      .skip((page - 1) * +limit)
      .limit(+limit);

    const total = await Campaign.countDocuments(filter);
    res.json({ campanhas, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId })
      .populate('produtoId', 'nome preco categoria');
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });
    res.json({ campanha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const campanha = await Campaign.create({ ...req.body, adegaId: req.adegaId });
    logger.info(`Campanha criada: ${campanha.nome}`);
    res.status(201).json({ campanha });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const campanha = await Campaign.findOneAndUpdate(
      { _id: req.params.id, adegaId: req.adegaId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });
    res.json({ campanha });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remover = async (req, res) => {
  try {
    const campanha = await Campaign.findOneAndDelete({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });
    res.json({ message: 'Campanha removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.criarDesignCanva = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    const adega = await Adega.findById(req.adegaId);
    const adegaConfig = adega ? adega.canvaConfig : null;

    const design = await canvaService.criarDesign(campanha.nome, campanha.tipo, adegaConfig);
    campanha.templateCanva = design.url;
    campanha.status = 'pronto';
    await campanha.save();

    res.json({ campanha, design });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.publicarYouTube = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    const adega = await Adega.findById(req.adegaId);
    const adegaConfig = adega ? adega.youtubeConfig : null;

    const video = await youtubeService.uploadVideo(
      campanha.nome,
      campanha.descricao || `Campanha: ${campanha.nome}`,
      null,
      'public',
      adegaConfig
    );

    campanha.videoId = video.id;
    campanha.urlYoutube = `https://youtube.com/watch?v=${video.id}`;
    campanha.status = 'publicado';
    campanha.publishedToYoutube = true;
    campanha.dataPublicacao = new Date();
    await campanha.save();

    await notificationService.campanhaPublicada(campanha, req.adegaId);
    logger.info(`Campanha publicada no YouTube: ${campanha.nome}`);

    res.json({ campanha, video });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.paraTV = async (req, res) => {
  try {
    const campanhas = await Campaign.find({
      adegaId: req.adegaId,
      status: 'publicado',
      urlYoutube: { $ne: '' },
    }).populate('produtoId', 'nome preco imagem categoria').sort({ dataPublicacao: -1 });

    res.json({ campanhas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.paraTVAtiva = async (req, res) => {
  try {
    const campanhas = await Campaign.find({
      adegaId: req.adegaId,
      ativoNaTV: true,
    }).populate('produtoId', 'nome preco imagem categoria').sort({ updatedAt: -1 });

    res.json({ campanhas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
