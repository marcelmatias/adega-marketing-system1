require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const passport = require('./config/passport');

const logger = require('./utils/logger');
const configLoader = require('./services/configLoader');
const asaasService = require('./services/asaasService');
const stripeService = require('./services/stripeService');
const mailService = require('./services/mailService');
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - strict by default, allow same-origin
app.use(cors({
  origin: process.env.BASE_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes. Tente novamente.' },
});
app.use(globalLimiter);

// Strict rate limiters for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

app.use(morgan('dev', {
  skip: (req) => req.url === '/health' || req.url.startsWith('/uploads/'),
}));

// Stripe webhook needs raw body for signature verification
app.use('/api/pagamentos/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Session
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  },
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Static assets with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProduction ? '1y' : 0,
  immutable: isProduction,
  etag: !isProduction,
}));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: isProduction ? '1d' : 0,
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (isProduction) app.enable('view cache');

// Global locals
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.user = req.session.user || null;
  res.locals.title = 'Rei da Adega';
  res.locals.isProduction = isProduction;
  next();
});

// Routes
app.use('/api/adegas', require('./routes/adegaRoutes'));
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/produtos', require('./routes/productRoutes'));
app.use('/api/financeiro', require('./routes/financeRoutes'));
app.use('/api/campanhas', require('./routes/campaignRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/tv', require('./routes/tvRoutes'));
app.use('/api/canva', require('./routes/canvaRoutes'));
app.use('/api/youtube', require('./routes/youtubeRoutes'));
app.use('/auth', require('./routes/oauthRoutes'));
app.use('/auth', require('./routes/socialRoutes'));
app.use('/api/midias', require('./routes/mediaRoutes'));
app.use('/api/live', require('./routes/liveRoutes'));
app.use('/api/instagram', require('./routes/instagramRoutes'));
app.use('/api', require('./routes/planRoutes'));
app.use('/api', require('./routes/marketplaceRoutes'));
app.use('/api/super', require('./routes/superRoutes'));
app.use('/api/pagamentos', require('./routes/paymentRoutes'));
app.use('/admin/configuracoes', require('./routes/settingsRoutes'));

const { authenticateView, authorize } = require('./middlewares/authMiddleware');
const Adega = require('./models/Adega');

// View routes
app.get('/', (req, res) => res.render('pages/index'));
app.get('/login', (req, res) => res.render('pages/login'));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

app.get('/admin', authenticateView, (req, res) => res.render('pages/dashboard'));
app.get('/admin/produtos', authenticateView, (req, res) => res.render('pages/produtos'));
app.get('/admin/financeiro', authenticateView, (req, res) => res.render('pages/financeiro'));
app.get('/admin/campanhas', authenticateView, async (req, res) => {
  let adega = null;
  try { adega = await Adega.findById(req.session.user.adegaId).select('youtubeConfig canvaConfig').lean(); } catch (_) {}
  res.render('pages/campanhas', {
    youtubeConfig: adega ? adega.youtubeConfig : { mock: true },
    canvaConfig: adega ? adega.canvaConfig : { mock: true },
  });
});
app.get('/admin/campanhas/:id', authenticateView, async (req, res) => {
  const Campaign = require('./models/Campaign');
  try {
    const campanha = await Campaign.findById(req.params.id).populate('produtoId', 'nome preco').lean();
    if (!campanha) return res.redirect('/admin/campanhas');
    const midias = (campanha.midias || []).sort((a, b) => a.ordem - b.ordem);
    res.render('pages/campanha-detalhe', { campanha, midias });
  } catch (_) { res.redirect('/admin/campanhas'); }
});
app.get('/admin/live', authenticateView, (req, res) => res.render('pages/live'));
app.get('/admin/instagram', authenticateView, (req, res) => res.render('pages/instagram'));

app.get('/admin/super', authenticateView, authorize('superadmin'), (req, res) => res.render('pages/super/dashboard'));
app.get('/admin/super/configuracoes', authenticateView, authorize('superadmin'), (req, res) => res.render('pages/super/config'));
app.get('/admin/super/adegas', authenticateView, authorize('superadmin'), (req, res) => res.render('pages/super/adegas'));
app.get('/admin/super/usuarios', authenticateView, authorize('superadmin'), (req, res) => res.render('pages/super/usuarios'));
app.get('/admin/super/planos', authenticateView, authorize('superadmin'), (req, res) => res.render('pages/super/planos'));
app.get('/admin/super/modulos', authenticateView, authorize('superadmin'), (req, res) => res.render('pages/super/modulos'));
app.get('/admin/super/pagamentos', authenticateView, authorize('superadmin'), (req, res) => res.render('pages/super/pagamentos'));

app.get('/admin/planos', authenticateView, async (req, res) => {
  const Plan = require('./models/Plan');
  const Module = require('./models/Module');
  const Subscription = require('./models/Subscription');
  const ModuleSubscription = require('./models/ModuleSubscription');
  const planos = await Plan.find({ ativo: true }).sort({ ordem: 1 }).lean();
  const modulos = await Module.find({ ativo: true }).sort({ ordem: 1 }).lean();
  let assinatura = null;
  let modulosAtivos = [];
  if (req.session.user?.adegaId) {
    assinatura = await Subscription.findOne({ adegaId: req.session.user.adegaId, status: { $in: ['ativo', 'trial'] } })
      .populate('planId').sort({ createdAt: -1 }).lean();
    const ativos = await ModuleSubscription.find({ adegaId: req.session.user.adegaId, status: 'ativo' }).lean();
    modulosAtivos = ativos.map(m => m.moduleSlug);
  }
  res.render('pages/planos', { planos, modulos, assinatura, modulosAtivos });
});

app.get('/player-tv', async (req, res) => {
  let adegaInfo = null;
  if (req.session?.user?.adegaId) {
    try {
      const Adega = require('./models/Adega');
      const a = await Adega.findById(req.session.user.adegaId).select('nome logo endereco').lean();
      if (a) adegaInfo = { nome: a.nome, logo: a.logo, endereco: a.endereco };
    } catch (_) {}
  }
  res.render('pages/player-tv', { adegaInfo });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
})
  .then(async () => {
    logger.info('MongoDB conectado');
    const config = await configLoader.loadConfig();
    asaasService.setConfig(config?.asaasApiKey, config?.asaasEnvironment);
    stripeService.setConfig(config?.stripeSecretKey, config?.stripePublishableKey, config?.stripeWebhookSecret);
    mailService.setConfig(config?.smtpHost, config?.smtpPort, config?.smtpUser, config?.smtpPass, config?.emailFrom);
    app.listen(PORT, () => logger.info(`Servidor rodando em http://localhost:${PORT}`));
  })
  .catch(err => {
    logger.error('Erro MongoDB: ' + err.message);
    process.exit(1);
  });

module.exports = app;
