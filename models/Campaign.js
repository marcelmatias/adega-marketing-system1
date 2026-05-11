const mongoose = require('mongoose');

const midiaSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['imagem', 'video'], required: true },
  arquivo: { type: String, required: true },
  nomeOriginal: { type: String, default: '' },
  duracao: { type: Number, default: 5, min: 1 },
  ordem: { type: Number, default: 0 },
}, { _id: true });

const campaignSchema = new mongoose.Schema({
  adegaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adega', required: true, index: true },
  nome: { type: String, required: true, trim: true },
  produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  templateCanva: { type: String, default: '' },
  arquivoFinal: { type: String, default: '' },
  status: { type: String, enum: ['rascunho', 'pronto', 'publicado'], default: 'rascunho' },
  urlYoutube: { type: String, default: '' },
  videoId: { type: String, default: '' },
  playlistId: { type: String, default: '' },
  dataPublicacao: { type: Date },
  dataExpiracao: { type: Date },
  descricao: { type: String, default: '' },
  tags: [{ type: String }],
  tipo: { type: String, enum: ['video', 'imagem', 'carrossel', 'story'], default: 'video' },
  publishedToYoutube: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },

  midias: [midiaSchema],
  audio: {
    arquivo: { type: String, default: '' },
    nomeOriginal: { type: String, default: '' },
  },
  ativoNaTV: { type: Boolean, default: false },
  duracaoPadraoImagem: { type: Number, default: 5, min: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
