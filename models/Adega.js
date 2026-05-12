const mongoose = require('mongoose');

const adegaSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  logo: { type: String, default: '' },
  endereco: {
    logradouro: String, numero: String, bairro: String,
    cidade: String, estado: String, cep: String,
  },
  whatsapp: { type: String, default: '' },
  telefone: { type: String, default: '' },
  email: { type: String, default: '' },
  youtubeConfig: {
    apiKey: { type: String, default: '' },
    clientId: { type: String, default: '' },
    clientSecret: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    mock: { type: Boolean, default: true },
    playlistId: { type: String, default: '' },
    channelId: { type: String, default: '' },
  },
  canvaConfig: {
    apiKey: { type: String, default: '' },
    apiSecret: { type: String, default: '' },
    mock: { type: Boolean, default: true },
    folderId: { type: String, default: '' },
    brandTemplateId: { type: String, default: '' },
  },
  instagramConfig: {
    igUserId: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    mock: { type: Boolean, default: true },
    facebookAppId: { type: String, default: '' },
    facebookAppSecret: { type: String, default: '' },
    tokenExpiresAt: { type: Date, default: null },
  },
  sistemaConfig: {
    baseUrl: { type: String, default: '' },
  },
  ativo: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Adega', adegaSchema);
