require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Adega = require('../models/Adega');
const User = require('../models/User');
const Product = require('../models/Product');
const Campaign = require('../models/Campaign');
const Finance = require('../models/Finance');
const logger = require('../utils/logger');

const produtosExemplo = [
  { nome: 'Skol Lata 350ml', categoria: 'cervesa', preco: 3.50, custo: 2.10, estoque: 200, estoqueMinimo: 50, volume: '350ml', teorAlcoolico: 4.5 },
  { nome: 'Heineken Long Neck', categoria: 'cervesa', preco: 7.90, custo: 4.50, estoque: 120, estoqueMinimo: 30, volume: '330ml', teorAlcoolico: 5.0 },
  { nome: 'Brahma Lata 350ml', categoria: 'cervesa', preco: 3.20, custo: 1.90, estoque: 180, estoqueMinimo: 50, volume: '350ml', teorAlcoolico: 4.8 },
  { nome: 'Vinho Tinto Suave', categoria: 'vinho', preco: 29.90, custo: 18.00, estoque: 45, estoqueMinimo: 10, volume: '750ml', teorAlcoolico: 12.0 },
  { nome: 'Jack Daniels 1L', categoria: 'destilado', preco: 129.90, custo: 85.00, estoque: 20, estoqueMinimo: 5, volume: '1L', teorAlcoolico: 40.0 },
  { nome: 'Agua Mineral 500ml', categoria: 'agua', preco: 2.00, custo: 1.20, estoque: 300, estoqueMinimo: 100, volume: '500ml' },
  { nome: 'Coca-Cola Lata 350ml', categoria: 'refrigerante', preco: 4.50, custo: 2.80, estoque: 250, estoqueMinimo: 60, volume: '350ml' },
  { nome: 'Red Bull 250ml', categoria: 'energetico', preco: 12.00, custo: 7.50, estoque: 60, estoqueMinimo: 15, volume: '250ml' },
  { nome: 'Suco Del Valle 1L', categoria: 'suco', preco: 6.90, custo: 4.20, estoque: 40, estoqueMinimo: 10, volume: '1L' },
  { nome: 'Vinho Chileno Cabernet', categoria: 'vinho', preco: 49.90, custo: 32.00, estoque: 30, estoqueMinimo: 8, volume: '750ml', teorAlcoolico: 13.5 },
];

const campanhasExemplo = [
  { nome: 'Promocao Skol - Verao 2025', tipo: 'video', status: 'rascunho', tags: ['promocao', 'skol', 'verao'], ativoNaTV: false, duracaoPadraoImagem: 5 },
  { nome: 'Happy Hour Heineken', tipo: 'video', status: 'pronto', tags: ['happy-hour', 'heineken'], ativoNaTV: true, duracaoPadraoImagem: 7 },
  { nome: 'Lancamento Vinho Chileno', tipo: 'imagem', status: 'rascunho', tags: ['lancamento', 'vinho'], ativoNaTV: false, duracaoPadraoImagem: 5 },
  { nome: 'Natal na Adega', tipo: 'carrossel', status: 'publicado', urlYoutube: 'https://youtube.com/watch?v=mock_natal', videoId: 'mock_natal', dataPublicacao: new Date(), publishedToYoutube: true, ativoNaTV: false, duracaoPadraoImagem: 5 },
  { nome: 'Jack Daniels - Dicas de Drink', tipo: 'video', status: 'publicado', urlYoutube: 'https://youtube.com/watch?v=mock_jack', videoId: 'mock_jack', dataPublicacao: new Date(Date.now() - 86400000), publishedToYoutube: true, ativoNaTV: true, duracaoPadraoImagem: 8 },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Conectado ao MongoDB');

    await Promise.all([
      Adega.deleteMany({}), User.deleteMany({}), Product.deleteMany({}),
      Campaign.deleteMany({}), Finance.deleteMany({}),
    ]);
    logger.info('Colecoes limpas');

    const adega = await Adega.create({
      nome: 'Adega Exemplo',
      logo: '',
      whatsapp: '(11) 99999-8888',
      telefone: '',
      email: 'contato@adegaexemplo.com.br',
      endereco: { logradouro: 'Rua das Adegas', numero: '123', cidade: 'Sao Paulo', estado: 'SP' },
      youtubeConfig: { mock: true, playlistId: '', channelId: '' },
      canvaConfig: { mock: true, folderId: '', brandTemplateId: '' },
    });
    logger.info(`Adega criada: ${adega.nome}`);

    const admin = await User.create({
      adegaId: adega._id, nome: 'Admin', email: 'admin@adega.com', senha: '123456', role: 'admin',
    });
    await User.create({
      adegaId: adega._id, nome: 'Funcionario', email: 'staff@adega.com', senha: '123456', role: 'staff',
    });
    await User.create({
      adegaId: adega._id, nome: 'Visualizador', email: 'viewer@adega.com', senha: '123456', role: 'viewer',
    });
    logger.info('Usuarios criados (admin: admin@adega.com / 123456)');

    const produtos = await Product.create(
      produtosExemplo.map(p => ({ ...p, adegaId: adega._id }))
    );
    logger.info(`${produtos.length} produtos criados`);

    const campanhas = await Campaign.create(
      campanhasExemplo.map(c => ({
        ...c, adegaId: adega._id,
        produtoId: produtos[Math.floor(Math.random() * produtos.length)]._id,
      }))
    );
    logger.info(`${campanhas.length} campanhas criadas`);

    const despesasFixas = [
      { categoria: 'aluguel', descricao: 'Aluguel do espaco', valor: 3500, dia: 5 },
      { categoria: 'salario', descricao: 'Salario funcionarios (2 funcionarios)', valor: 4800, dia: 1 },
      { categoria: 'energia', descricao: 'Conta de energia eletrica', valor: 520, dia: 10 },
      { categoria: 'agua', descricao: 'Conta de agua', valor: 180, dia: 12 },
      { categoria: 'internet', descricao: 'Internet e telefone', valor: 199, dia: 8 },
      { categoria: 'marketing', descricao: 'Marketing e anuncios online', valor: 600, dia: 7 },
      { categoria: 'pro-labore', descricao: 'Pro-labore administrador', valor: 5000, dia: 1 },
    ];

    const registrosFinanceiros = [];
    const agora = Date.now();
    for (const desp of despesasFixas) {
      for (let m = 0; m < 2; m++) {
        const data = new Date();
        data.setMonth(data.getMonth() - m);
        data.setDate(desp.dia);
        data.setHours(10, 0, 0, 0);
        if (data > new Date()) continue;
        registrosFinanceiros.push({
          adegaId: adega._id,
          tipo: 'despesa',
          categoria: desp.categoria,
          descricao: `${desp.descricao} - ${data.toLocaleDateString('pt-BR')}`,
          valor: desp.valor,
          data,
          formaPagamento: 'pix',
          status: 'pago',
          registradoPor: admin._id,
        });
      }
    }

    const financeiros = await Finance.insertMany(registrosFinanceiros);
    logger.info(`${financeiros.length} registros financeiros criados (despesas)`);

    logger.info('========================================');
    logger.info('  SEED CONCLUIDO');
    logger.info('  Admin: admin@adega.com / 123456');
    logger.info('  Staff: staff@adega.com / 123456');
    logger.info('  Viewer: viewer@adega.com / 123456');
    logger.info(`  ${financeiros.length} registros financeiros`);
    logger.info('========================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error(`Erro no seed: ${err.message}`);
    process.exit(1);
  }
}

seed();
