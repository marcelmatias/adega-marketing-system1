const Finance = require('../models/Finance');
const logger = require('../utils/logger');
const { exportFinanceiroCSV, exportFinanceiroPDF } = require('../services/exportService');

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
    const match = { adegaId: req.adegaId, status: 'pago' };
    if (startDate || endDate) {
      match.data = {};
      if (startDate) match.data.$gte = new Date(startDate);
      if (endDate) match.data.$lte = new Date(endDate);
    }

    const [totals, byCategory] = await Promise.all([
      Finance.aggregate([
        { $match: match },
        { $group: { _id: '$tipo', total: { $sum: '$valor' } } },
      ]),
      Finance.aggregate([
        { $match: match },
        { $group: { _id: { categoria: '$categoria', tipo: '$tipo' }, total: { $sum: '$valor' } } },
      ]),
    ]);

    const receitas = totals.find(t => t._id === 'receita')?.total || 0;
    const despesas = totals.find(t => t._id === 'despesa')?.total || 0;
    const saldo = receitas - despesas;

    const porCategoria = {};
    byCategory.forEach(item => {
      const cat = item._id.categoria;
      if (!porCategoria[cat]) porCategoria[cat] = { receitas: 0, despesas: 0 };
      if (item._id.tipo === 'receita') porCategoria[cat].receitas += item.total;
      else porCategoria[cat].despesas += item.total;
    });

    res.json({ receitas, despesas, saldo, porCategoria });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportarCSV = async (req, res) => {
  try {
    const { tipo, categoria, status, startDate, endDate } = req.query;
    const filter = { adegaId: req.adegaId };
    if (tipo) filter.tipo = tipo;
    if (categoria) filter.categoria = categoria;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.data = {};
      if (startDate) filter.data.$gte = new Date(startDate);
      if (endDate) filter.data.$lte = new Date(endDate);
    }

    const registros = await Finance.find(filter).sort({ data: -1 }).lean();
    const csv = exportFinanceiroCSV(registros);
    const filename = `financeiro-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportarPDF = async (req, res) => {
  try {
    const { tipo, categoria, status, startDate, endDate } = req.query;
    const filter = { adegaId: req.adegaId };
    if (tipo) filter.tipo = tipo;
    if (categoria) filter.categoria = categoria;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.data = {};
      if (startDate) filter.data.$gte = new Date(startDate);
      if (endDate) filter.data.$lte = new Date(endDate);
    }

    const registros = await Finance.find(filter).sort({ data: -1 }).lean();

    const fluxoMatch = { adegaId: req.adegaId, status: 'pago' };
    if (startDate || endDate) {
      fluxoMatch.data = {};
      if (startDate) fluxoMatch.data.$gte = new Date(startDate);
      if (endDate) fluxoMatch.data.$lte = new Date(endDate);
    }
    const totals = await Finance.aggregate([
      { $match: fluxoMatch },
      { $group: { _id: '$tipo', total: { $sum: '$valor' } } },
    ]);
    const fluxo = {
      receitas: totals.find(t => t._id === 'receita')?.total || 0,
      despesas: totals.find(t => t._id === 'despesa')?.total || 0,
      saldo: 0,
    };
    fluxo.saldo = fluxo.receitas - fluxo.despesas;

    let subtitulo = '';
    if (startDate) subtitulo += `De: ${new Date(startDate).toLocaleDateString('pt-BR')}`;
    if (endDate) subtitulo += `${subtitulo ? ' ' : ''}Ate: ${new Date(endDate).toLocaleDateString('pt-BR')}`;

    const pdf = await exportFinanceiroPDF(registros, fluxo, subtitulo);
    const filename = `financeiro-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.relatorioMensal = async (req, res) => {
  try {
    const { ano = new Date().getFullYear() } = req.query;
    const inicio = new Date(`${ano}-01-01`);
    const fim = new Date(`${ano}-12-31T23:59:59`);

    const match = {
      adegaId: req.adegaId,
      status: 'pago',
      data: { $gte: inicio, $lte: fim },
    };

    const [totals, monthly] = await Promise.all([
      Finance.aggregate([
        { $match: match },
        { $group: { _id: '$tipo', total: { $sum: '$valor' } } },
      ]),
      Finance.aggregate([
        { $match: match },
        {
          $group: {
            _id: { mes: { $month: '$data' }, tipo: '$tipo' },
            total: { $sum: '$valor' },
          },
        },
      ]),
    ]);

    const receitas = totals.find(t => t._id === 'receita')?.total || 0;
    const despesas = totals.find(t => t._id === 'despesa')?.total || 0;
    const lucroLiquido = receitas - despesas;

    const mensal = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      return {
        mes,
        receitas: monthly.filter(m => m._id.mes === mes && m._id.tipo === 'receita').reduce((s, m) => s + m.total, 0),
        despesas: monthly.filter(m => m._id.mes === mes && m._id.tipo === 'despesa').reduce((s, m) => s + m.total, 0),
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
