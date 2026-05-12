require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Muitas requisicoes. Tente novamente.' },
});

app.use(limiter);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' },
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.user = req.session.user || null;
  res.locals.title = 'Rei da Adega';
  next();
});

const adegaRoutes = require('./routes/adegaRoutes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const financeRoutes = require('./routes/financeRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const tvRoutes = require('./routes/tvRoutes');
const canvaRoutes = require('./routes/canvaRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const liveRoutes = require('./routes/liveRoutes');
const instagramRoutes = require('./routes/instagramRoutes');
const planRoutes = require('./routes/planRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const socialRoutes = require('./routes/socialRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');

app.use('/api/adegas', adegaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/produtos', productRoutes);
app.use('/api/financeiro', financeRoutes);
app.use('/api/campanhas', campaignRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tv', tvRoutes);
app.use('/api/canva', canvaRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/auth', oauthRoutes);
app.use('/auth', socialRoutes);
app.use('/api/midias', mediaRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api', planRoutes);
app.use('/api', marketplaceRoutes);
app.use('/api/pagamentos', paymentRoutes);

app.use('/admin/configuracoes', settingsRoutes);

const { authenticateView } = require('./middlewares/authMiddleware');
const Adega = require('./models/Adega');

app.get('/', (req, res) => res.render('pages/index'));
app.get('/login', (req, res) => res.render('pages/login'));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

app.get('/admin', authenticateView, (req, res) => res.render('pages/dashboard'));
app.get('/admin/produtos', authenticateView, (req, res) => res.render('pages/produtos'));
app.get('/admin/financeiro', authenticateView, (req, res) => res.render('pages/financeiro'));
app.get('/admin/campanhas', authenticateView, async (req, res) => {
  let adega = null;
  try { adega = await Adega.findById(req.session.user.adegaId); } catch (_) {}
  res.render('pages/campanhas', {
    youtubeConfig: adega ? adega.youtubeConfig : { mock: true },
    canvaConfig: adega ? adega.canvaConfig : { mock: true },
  });
});
app.get('/admin/campanhas/:id', authenticateView, async (req, res) => {
  const Campaign = require('./models/Campaign');
  try {
    const campanha = await Campaign.findById(req.params.id).populate('produtoId', 'nome preco');
    if (!campanha) return res.redirect('/admin/campanhas');
    const midias = campanha.midias.sort((a, b) => a.ordem - b.ordem);
    res.render('pages/campanha-detalhe', { campanha, midias });
  } catch (_) { res.redirect('/admin/campanhas'); }
});
app.get('/admin/live', authenticateView, (req, res) => res.render('pages/live'));
app.get('/admin/instagram', authenticateView, (req, res) => res.render('pages/instagram'));

app.get('/admin/planos', authenticateView, async (req, res) => {
  const Plan = require('./models/Plan');
  const Module = require('./models/Module');
  const Subscription = require('./models/Subscription');
  const ModuleSubscription = require('./models/ModuleSubscription');
  const planos = await Plan.find({ ativo: true }).sort({ ordem: 1 });
  const modulos = await Module.find({ ativo: true }).sort({ ordem: 1 });
  let assinatura = null;
  let modulosAtivos = [];
  if (req.session.user?.adegaId) {
    assinatura = await Subscription.findOne({ adegaId: req.session.user.adegaId, status: { $in: ['ativo', 'trial'] } })
      .populate('planId').sort({ createdAt: -1 });
    const ativos = await ModuleSubscription.find({ adegaId: req.session.user.adegaId, status: 'ativo' });
    modulosAtivos = ativos.map(m => m.moduleSlug);
  }
  res.render('pages/planos', { planos, modulos, assinatura, modulosAtivos });
});

app.get('/player-tv', async (req, res) => {
  let adegaInfo = null;
  if (req.session?.user?.adegaId) {
    try {
      const Adega = require('./models/Adega');
      const a = await Adega.findById(req.session.user.adegaId).select('nome logo endereco');
      if (a) adegaInfo = { nome: a.nome, logo: a.logo, endereco: a.endereco };
    } catch (_) {}
  }
  res.render('pages/player-tv', { adegaInfo });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('MongoDB conectado');
    app.listen(PORT, () => logger.info(`Servidor rodando em http://localhost:${PORT}`));
  })
  .catch(err => {
    logger.error('Erro MongoDB: ' + err.message);
    process.exit(1);
  });

module.exports = app;
