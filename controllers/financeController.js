const Finance = require('../models/Finance');
const logger = require('../utils/logger');

exports.listar = async (req, res) => {
  try {
    const { tipo, categoria, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = { adegaId: req.adegaId };
    if (tipo) filter.tipo = tipo;
    if (categoria) filter.categoria = categoria;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.data = {};
      if (startDate) filter.data.$gte = new Date(startDate);
      if (endDate) filter.data.$lte = new Date(endDate);
    }

    const registros = await Finance.find(filter)
      .sort({ data: -1 })
      .skip((page - 1) * +limit)
      .limit(+limit);

    const total = await Finance.countDocuments(filter);
    res.json({ registros, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const registro = await Finance.create({ ...req.body, adegaId: req.adegaId, registradoPor: req.user?._id });
    logger.info(`Registro financeiro: ${registro.tipo} R$ ${registro.valor}`);
    res.status(201).json({ registro });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const registro = await Finance.findOneAndUpdate(
      { _id: req.params.id, adegaId: req.adegaId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!registro) return res.status(404).json({ error: 'Registro nao encontrado' });
    res.json({ registro });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remover = async (req, res) => {
  try {
    const registro = await Finance.findOneAndDelete({ _id: req.params.id, adegaId: req.adegaId });
    if (!registro) return res.status(404).json({ error: 'Registro nao encontrado' });
    res.json({ message: 'Registro removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.fluxoCaixa = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { adegaId: req.adegaId, status: 'pago' };
    if (startDate || endDate) {
      filter.data = {};
      if (startDate) filter.data.$gte = new Date(startDate);
      if (endDate) filter.data.$lte = new Date(endDate);
    }

    const registros = await Finance.find(filter);
    const receitas = registros.filter(r => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);
    const despesas = registros.filter(r => r.tipo === 'despesa').reduce((s, r) => s + r.valor, 0);
    const saldo = receitas - despesas;

    const porCategoria = registros.reduce((acc, r) => {
      if (!acc[r.categoria]) acc[r.categoria] = { receitas: 0, despesas: 0 };
      if (r.tipo === 'receita') acc[r.categoria].receitas += r.valor;
      else acc[r.categoria].despesas += r.valor;
      return acc;
    }, {});

    res.json({ receitas, despesas, saldo, porCategoria });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.relatorioMensal = async (req, res) => {
  try {
    const { ano = new Date().getFullYear() } = req.query;
    const inicio = new Date(`${ano}-01-01`);
    const fim = new Date(`${ano}-12-31T23:59:59`);

    const registros = await Finance.find({
      adegaId: req.adegaId,
      status: 'pago',
      data: { $gte: inicio, $lte: fim },
    });

    const receitas = registros.filter(r => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);
    const despesas = registros.filter(r => r.tipo === 'despesa').reduce((s, r) => s + r.valor, 0);
    const lucroLiquido = receitas - despesas;

    const mensal = Array.from({ length: 12 }, (_, i) => {
      const mesRegistros = registros.filter(r => new Date(r.data).getMonth() === i);
      return {
        mes: i + 1,
        receitas: mesRegistros.filter(r => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0),
        despesas: mesRegistros.filter(r => r.tipo === 'despesa').reduce((s, r) => s + r.valor, 0),
      };
    });

    res.json({
      ano: +ano,
      receitas,
      despesas,
      lucroLiquido,
      mensal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
