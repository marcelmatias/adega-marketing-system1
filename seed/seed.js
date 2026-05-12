require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Adega = require('../models/Adega');
const User = require('../models/User');
const Product = require('../models/Product');
const Campaign = require('../models/Campaign');
const Finance = require('../models/Finance');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Module = require('../models/Module');
const logger = require('../utils/logger');

const planosIniciais = [
  {
    nome: 'Gratuito', slug: 'gratuito', descricao: 'Para testar o sistema',
    precoMensal: 0, precoAnual: 0,
    modulos: ['campanhas'],
    limites: { maxUsuarios: 1, maxProdutos: 20, maxCampanhas: 5 },
    destaque: false, ordem: 1,
  },
  {
    nome: 'Basico', slug: 'basico', descricao: 'Para pequenas adegas',
    precoMensal: 49.90, precoAnual: 499.90,
    modulos: ['campanhas', 'tv', 'youtube'],
    limites: { maxUsuarios: 2, maxProdutos: 50, maxCampanhas: 20, produtosPorPagina: true },
    destaque: false, ordem: 2,
  },
  {
    nome: 'Profissional', slug: 'profissional', descricao: 'Para crescimento',
    precoMensal: 99.90, precoAnual: 999.90,
    modulos: ['campanhas', 'tv', 'youtube', 'instagram', 'canva', 'entradas-saidas'],
    limites: { maxUsuarios: 5, maxProdutos: 200, maxCampanhas: 100, produtosPorPagina: true, exportarDados: true },
    destaque: true, ordem: 3,
  },
  {
    nome: 'Enterprise', slug: 'enterprise', descricao: 'Tudo liberado',
    precoMensal: 199.90, precoAnual: 1999.90,
    modulos: ['campanhas', 'tv', 'youtube', 'instagram', 'canva', 'loja', 'estoque', 'caixa', 'entradas-saidas', 'financeiro', 'live'],
    limites: { maxUsuarios: 20, maxProdutos: 9999, maxCampanhas: 9999, produtosPorPagina: true, suportePrioritario: true, exportarDados: true },
    destaque: false, ordem: 4,
  },
];

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

const modulosIndividuais = [
  { nome: 'Campanhas', slug: 'campanhas', descricao: 'Crie e gerencie campanhas de marketing com midias, YouTube e Canva', descricaoCurta: 'Campanhas de marketing', icone: 'bi-megaphone', precoMensal: 19.90, precoAnual: 199.90, ordem: 1, destaque: true },
  { nome: 'Player TV', slug: 'tv', descricao: 'Exiba campanhas em looping na TV da sua adega com imagens e videos', descricaoCurta: 'TV de propaganda', icone: 'bi-tv', precoMensal: 14.90, precoAnual: 149.90, ordem: 2 },
  { nome: 'Instagram', slug: 'instagram', descricao: 'Publique fotos e videos diretamente no Instagram da sua adega', descricaoCurta: 'Publicacao no Instagram', icone: 'bi-instagram', precoMensal: 14.90, precoAnual: 149.90, ordem: 3 },
  { nome: 'YouTube', slug: 'youtube', descricao: 'Upload de videos, lives e gerenciamento de playlist no YouTube', descricaoCurta: 'Videos no YouTube', icone: 'bi-youtube', precoMensal: 14.90, precoAnual: 149.90, ordem: 4 },
  { nome: 'Canva', slug: 'canva', descricao: 'Crie designs profissionais integrados com a API do Canva', descricaoCurta: 'Designs no Canva', icone: 'bi-palette', precoMensal: 9.90, precoAnual: 99.90, ordem: 5 },
  { nome: 'Entradas e Saidas', slug: 'entradas-saidas', descricao: 'Controle financeiro completo com receitas, despesas e categorias', descricaoCurta: 'Controle financeiro', icone: 'bi-cash-stack', precoMensal: 19.90, precoAnual: 199.90, ordem: 6 },
  { nome: 'Loja Online', slug: 'loja', descricao: 'Catalogo de produtos com vitrine digital para seus clientes', descricaoCurta: 'Loja virtual', icone: 'bi-cart', precoMensal: 29.90, precoAnual: 299.90, ordem: 7 },
  { nome: 'Estoque', slug: 'estoque', descricao: 'Gestao completa de estoque com alertas de reposicao', descricaoCurta: 'Controle de estoque', icone: 'bi-box-seam', precoMensal: 19.90, precoAnual: 199.90, ordem: 8 },
  { nome: 'Caixa', slug: 'caixa', descricao: 'Registre vendas no caixa e acompanhe o fluxo do dia', descricaoCurta: 'Caixa diario', icone: 'bi-calculator', precoMensal: 14.90, precoAnual: 149.90, ordem: 9 },
  { nome: 'Financeiro', slug: 'financeiro', descricao: 'Relatorios financeiros, DRE, fluxo de caixa e projecoes', descricaoCurta: 'Relatorios financeiros', icone: 'bi-graph-up-arrow', precoMensal: 24.90, precoAnual: 249.90, ordem: 10 },
  { nome: 'Live', slug: 'live', descricao: 'Transmita ao vivo com slides dos seus produtos para YouTube e Instagram', descricaoCurta: 'Transmissoes ao vivo', icone: 'bi-broadcast', precoMensal: 19.90, precoAnual: 199.90, ordem: 11 },
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
      Campaign.deleteMany({}), Finance.deleteMany({}), Plan.deleteMany({}), Subscription.deleteMany({}),
      Module.deleteMany({}),
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
      sistemaConfig: { baseUrl: '' },
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
    await User.create({
      nome: 'Super Admin', email: 'super@reidaadega.com', senha: 'admin123', role: 'superadmin',
    });
    logger.info('Super admin criado (super@reidaadega.com / admin123)');

    // Garante config padrao no banco
    const SystemConfig = require('../models/SystemConfig');
    await SystemConfig.deleteMany({});
    await SystemConfig.create({ baseUrl: 'http://localhost:3000', systemName: 'Rei da Adega', trialDays: 7, asaasEnvironment: 'sandbox' });
    logger.info('Usuarios criados (admin: admin@adega.com / 123456)');

    const produtos = await Product.create(
      produtosExemplo.map(p => ({ ...p, adegaId: adega._id }))
    );
    logger.info(`${produtos.length} produtos criados`);

    const planos = await Plan.create(planosIniciais);
    logger.info(`${planos.length} planos criados`);

    const modulos = await Module.create(modulosIndividuais);
    logger.info(`${modulos.length} modulos avulsos criados`);

    await Subscription.create({
      adegaId: adega._id,
      planId: planos[0]._id,
      status: 'ativo',
      ciclo: 'mensal',
      modulosLiberados: planos[0].modulos,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    logger.info('Assinatura gratuita criada para adega exemplo');

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
