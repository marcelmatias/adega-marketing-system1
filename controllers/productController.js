const Product = require('../models/Product');
const Adega = require('../models/Adega');
const path = require('path');
const { generateSlides } = require('../services/slideService');
const { getActiveStreamInfo, startStream, stopStream } = require('../services/streamService');
const logger = require('../utils/logger');
const { exportProdutosCSV, exportProdutosPDF } = require('../services/exportService');

const SLIDES_DIR = path.join(__dirname, '..', 'public', 'uploads', 'live');

async function atualizarSlidesLive(adegaId) {
  try {
    const adega = await Adega.findById(adegaId);
    if (!adega) return;
    const produtos = await Product.find({ adegaId, ativo: true }).sort({ nome: 1 });
    await generateSlides(adega, produtos, SLIDES_DIR);
    const info = getActiveStreamInfo();
    if (info) {
      await stopStream();
      await startStream(SLIDES_DIR, info.rtmpUrl, info.streamKey);
    }
  } catch (_) {}
}

exports.listar = async (req, res) => {
  try {
    const { categoria, ativo, busca, page = 1, limit = 20 } = req.query;
    const filter = { adegaId: req.adegaId };
    if (categoria) filter.categoria = categoria;
    if (ativo !== undefined) filter.ativo = ativo === 'true';
    if (busca) filter.nome = { $regex: busca, $options: 'i' };

    const produtos = await Product.find(filter)
      .sort({ nome: 1 })
      .skip((page - 1) * +limit)
      .limit(+limit);

    const total = await Product.countDocuments(filter);
    res.json({ produtos, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const produto = await Product.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!produto) return res.status(404).json({ error: 'Produto nao encontrado' });
    res.json({ produto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const produto = await Product.create({ ...req.body, adegaId: req.adegaId });
    logger.info(`Produto criado: ${produto.nome}`);
    atualizarSlidesLive(req.adegaId);
    res.status(201).json({ produto });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const produto = await Product.findOneAndUpdate(
      { _id: req.params.id, adegaId: req.adegaId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!produto) return res.status(404).json({ error: 'Produto nao encontrado' });
    atualizarSlidesLive(req.adegaId);
    res.json({ produto });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remover = async (req, res) => {
  try {
    const produto = await Product.findOneAndDelete({ _id: req.params.id, adegaId: req.adegaId });
    if (!produto) return res.status(404).json({ error: 'Produto nao encontrado' });
    atualizarSlidesLive(req.adegaId);
    res.json({ message: 'Produto removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.estoqueBaixo = async (req, res) => {
  try {
    const produtos = await Product.find({
      adegaId: req.adegaId,
      ativo: true,
      $expr: { $lte: ['$estoque', '$estoqueMinimo'] },
    }).sort({ estoque: 1 });
    res.json({ produtos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportarCSV = async (req, res) => {
  try {
    const { categoria, ativo, busca } = req.query;
    const filter = { adegaId: req.adegaId };
    if (categoria) filter.categoria = categoria;
    if (ativo !== undefined) filter.ativo = ativo === 'true';
    if (busca) filter.nome = { $regex: busca, $options: 'i' };

    const produtos = await Product.find(filter).sort({ nome: 1 }).lean();
    const csv = exportProdutosCSV(produtos);
    const filename = `produtos-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportarPDF = async (req, res) => {
  try {
    const { categoria, ativo, busca } = req.query;
    const filter = { adegaId: req.adegaId };
    if (categoria) filter.categoria = categoria;
    if (ativo !== undefined) filter.ativo = ativo === 'true';
    if (busca) filter.nome = { $regex: busca, $options: 'i' };

    const produtos = await Product.find(filter).sort({ nome: 1 }).lean();
    const pdf = await exportProdutosPDF(produtos, `Total: ${produtos.length} produtos`);
    const filename = `produtos-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.atualizarEstoque = async (req, res) => {
  try {
    const { quantidade } = req.body;
    const produto = await Product.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!produto) return res.status(404).json({ error: 'Produto nao encontrado' });
    produto.estoque += quantidade;
    if (produto.estoque < 0) return res.status(400).json({ error: 'Estoque nao pode ser negativo' });
    await produto.save();
    res.json({ produto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
