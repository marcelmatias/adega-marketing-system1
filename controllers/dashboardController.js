const Product = require('../models/Product');
const Campaign = require('../models/Campaign');

exports.index = async (req, res) => {
  try {
    const filter = { adegaId: req.adegaId };

    const [totalProdutos, produtosEstoqueBaixo, campanhas, ativasTV] = await Promise.all([
      Product.countDocuments({ ...filter, ativo: true }),
      Product.countDocuments({ ...filter, ativo: true, $expr: { $lte: ['$estoque', '$estoqueMinimo'] } }),
      Campaign.find(filter).sort({ updatedAt: -1 }).limit(10).select('nome status tipo ativoNaTV updatedAt'),
      Campaign.countDocuments({ ...filter, ativoNaTV: true }),
    ]);

    const total = campanhas.length;
    const rascunho = campanhas.filter(c => c.status === 'rascunho').length;
    const prontas = campanhas.filter(c => c.status === 'pronto').length;
    const publicadas = campanhas.filter(c => c.status === 'publicado').length;

    res.json({
      totalProdutos,
      produtosEstoqueBaixo,
      totalCampanhas: await Campaign.countDocuments(filter),
      rascunho,
      prontas,
      publicadas,
      ativasTV,
      ultimasCampanhas: campanhas,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
