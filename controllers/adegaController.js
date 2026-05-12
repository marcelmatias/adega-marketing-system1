const Adega = require('../models/Adega');
const logger = require('../utils/logger');

const ALLOWED_FIELDS = ['nome', 'logo', 'endereco', 'whatsapp', 'telefone', 'email', 'sistemaConfig'];

exports.criar = async (req, res) => {
  try {
    const data = {};
    ALLOWED_FIELDS.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const adega = await Adega.create(data);
    logger.info(`Adega criada: ${adega.nome}`);
    res.status(201).json({ adega: adega.toJSON() });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar adega' });
  }
};

exports.listar = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.ativo !== undefined) filter.ativo = req.query.ativo === 'true';
    const [adegas, total] = await Promise.all([
      Adega.find(filter).sort({ nome: 1 }).skip(skip).limit(limit)
        .select('nome logo endereco whatsapp telefone email ativo createdAt'),
      Adega.countDocuments(filter),
    ]);
    res.json({ adegas, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar adegas' });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const adega = await Adega.findById(req.params.id)
      .select('-youtubeConfig -canvaConfig -instagramConfig -asaasCustomerId');
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    res.json({ adega });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar adega' });
  }
};

exports.buscarMe = async (req, res) => {
  try {
    const adega = await Adega.findById(req.adegaId).select('-youtubeConfig -canvaConfig -instagramConfig');
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    res.json({ adega });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar adega' });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const data = {};
    ALLOWED_FIELDS.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const adega = await Adega.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
      .select('-youtubeConfig -canvaConfig -instagramConfig');
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    res.json({ adega });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar adega' });
  }
};

exports.remover = async (req, res) => {
  try {
    const adega = await Adega.findByIdAndDelete(req.params.id);
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    res.json({ message: 'Adega removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover adega' });
  }
};
