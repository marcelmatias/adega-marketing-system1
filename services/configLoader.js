const SystemConfig = require('../models/SystemConfig');
const logger = require('../utils/logger');

let cachedConfig = null;

async function loadConfig() {
  try {
    cachedConfig = await SystemConfig.findOne().sort({ createdAt: -1 });
    if (!cachedConfig) {
      cachedConfig = await SystemConfig.create({});
      logger.info('Configuracao do sistema criada com valores padrao');
    }
    logger.info('Configuracao do sistema carregada do banco');

    // Sync to process.env for services that read from env
    if (cachedConfig.asaasApiKey) process.env.ASAAS_API_KEY = cachedConfig.asaasApiKey;
    if (cachedConfig.asaasEnvironment) process.env.ASAAS_ENVIRONMENT = cachedConfig.asaasEnvironment;
    if (cachedConfig.stripeSecretKey) process.env.STRIPE_SECRET_KEY = cachedConfig.stripeSecretKey;
    if (cachedConfig.stripePublishableKey) process.env.STRIPE_PUBLISHABLE_KEY = cachedConfig.stripePublishableKey;
    if (cachedConfig.stripeWebhookSecret) process.env.STRIPE_WEBHOOK_SECRET = cachedConfig.stripeWebhookSecret;
    if (cachedConfig.mercadoPagoAccessToken) process.env.MERCADO_PAGO_ACCESS_TOKEN = cachedConfig.mercadoPagoAccessToken;
    if (cachedConfig.googleClientId) process.env.GOOGLE_CLIENT_ID = cachedConfig.googleClientId;
    if (cachedConfig.googleClientSecret) process.env.GOOGLE_CLIENT_SECRET = cachedConfig.googleClientSecret;
    if (cachedConfig.facebookAppId) process.env.FACEBOOK_APP_ID = cachedConfig.facebookAppId;
    if (cachedConfig.facebookAppSecret) process.env.FACEBOOK_APP_SECRET = cachedConfig.facebookAppSecret;
    if (cachedConfig.baseUrl) process.env.BASE_URL = cachedConfig.baseUrl;
    if (cachedConfig.smtpHost) process.env.SMTP_HOST = cachedConfig.smtpHost;
    if (cachedConfig.smtpPort) process.env.SMTP_PORT = String(cachedConfig.smtpPort);
    if (cachedConfig.smtpUser) process.env.SMTP_USER = cachedConfig.smtpUser;
    if (cachedConfig.smtpPass) process.env.SMTP_PASS = cachedConfig.smtpPass;
    if (cachedConfig.emailFrom) process.env.EMAIL_FROM = cachedConfig.emailFrom;

    return cachedConfig;
  } catch (err) {
    logger.error(`Erro ao carregar config do sistema: ${err.message}`);
    return null;
  }
}

function getConfig() {
  return cachedConfig;
}

function setConfig(config) {
  cachedConfig = config;
  // Re-sync to process.env
  if (config.asaasApiKey) process.env.ASAAS_API_KEY = config.asaasApiKey;
  if (config.asaasEnvironment) process.env.ASAAS_ENVIRONMENT = config.asaasEnvironment;
  if (config.stripeSecretKey) process.env.STRIPE_SECRET_KEY = config.stripeSecretKey;
  if (config.stripePublishableKey) process.env.STRIPE_PUBLISHABLE_KEY = config.stripePublishableKey;
  if (config.stripeWebhookSecret) process.env.STRIPE_WEBHOOK_SECRET = config.stripeWebhookSecret;
  if (config.mercadoPagoAccessToken) process.env.MERCADO_PAGO_ACCESS_TOKEN = config.mercadoPagoAccessToken;
  if (config.googleClientId) process.env.GOOGLE_CLIENT_ID = config.googleClientId;
  if (config.googleClientSecret) process.env.GOOGLE_CLIENT_SECRET = config.googleClientSecret;
  if (config.facebookAppId) process.env.FACEBOOK_APP_ID = config.facebookAppId;
  if (config.facebookAppSecret) process.env.FACEBOOK_APP_SECRET = config.facebookAppSecret;
  if (config.baseUrl) process.env.BASE_URL = config.baseUrl;
  if (config.smtpHost) process.env.SMTP_HOST = config.smtpHost;
  if (config.smtpPort) process.env.SMTP_PORT = config.smtpPort;
  if (config.smtpUser) process.env.SMTP_USER = config.smtpUser;
  if (config.smtpPass) process.env.SMTP_PASS = config.smtpPass;
  if (config.emailFrom) process.env.EMAIL_FROM = config.emailFrom;
  // Sync services
  const asaasService = require('./asaasService');
  const stripeService = require('./stripeService');
  const mailService = require('./mailService');
  asaasService.setConfig(config.asaasApiKey, config.asaasEnvironment);
  stripeService.setConfig(config.stripeSecretKey, config.stripePublishableKey, config.stripeWebhookSecret);
  mailService.setConfig(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, config.emailFrom);
}

module.exports = { loadConfig, getConfig, setConfig };
