const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // System
  baseUrl: { type: String, default: 'http://localhost:3000' },
  systemName: { type: String, default: 'Rei da Adega' },

  // Asaas
  asaasApiKey: { type: String, default: '' },
  asaasEnvironment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },

  // Stripe
  stripeSecretKey: { type: String, default: '' },
  stripePublishableKey: { type: String, default: '' },
  stripeWebhookSecret: { type: String, default: '' },

  // YouTube API (global - usado como fallback se adega nao tiver propria config)
  youtubeClientId: { type: String, default: '' },
  youtubeClientSecret: { type: String, default: '' },
  youtubeApiKey: { type: String, default: '' },

  // Canva API (global - fallback)
  canvaApiKey: { type: String, default: '' },
  canvaApiSecret: { type: String, default: '' },

  // Instagram / Facebook Graph API (global - fallback)
  instagramFacebookAppId: { type: String, default: '' },
  instagramFacebookAppSecret: { type: String, default: '' },

  // Mercado Pago (deprecated - kept for backward compat)
  mercadoPagoAccessToken: { type: String, default: '' },

  // Google OAuth
  googleClientId: { type: String, default: '' },
  googleClientSecret: { type: String, default: '' },

  // Facebook OAuth
  facebookAppId: { type: String, default: '' },
  facebookAppSecret: { type: String, default: '' },

  // SMTP / Email (future)
  smtpHost: { type: String, default: '' },
  smtpPort: { type: Number, default: 587 },
  smtpUser: { type: String, default: '' },
  smtpPass: { type: String, default: '' },
  emailFrom: { type: String, default: '' },

  // Maintenance
  manutencao: { type: Boolean, default: false },
  manutencaoMensagem: { type: String, default: '' },

  // Registration
  permitirCadastro: { type: Boolean, default: true },
  trialDays: { type: Number, default: 7 },
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
