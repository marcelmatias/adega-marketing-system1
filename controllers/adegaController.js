const Adega = require('../models/Adega');
const logger = require('../utils/logger');

exports.criar = async (req, res) => {
  try {
    const adega = await Adega.create(req.body);
    logger.info(`Adega criada: ${adega.nome}`);
    res.status(201).json({ adega });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const adegas = await Adega.find().sort({ nome: 1 });
    res.json({ adegas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const adega = await Adega.findById(req.params.id);
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    res.json({ adega });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.buscarMe = async (req, res) => {
  try {
    const adega = await Adega.findById(req.adegaId).select('-youtubeConfig -canvaConfig');
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    res.json({ adega });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const adega = await Adega.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    res.json({ adega });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remover = async (req, res) => {
  try {
    const adega = await Adega.findByIdAndDelete(req.params.id);
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });
    res.json({ message: 'Adega removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
