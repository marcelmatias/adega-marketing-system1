const logger = require('../utils/logger');
const mailService = require('./mailService');
const User = require('../models/User');
const Adega = require('../models/Adega');

class NotificationService {
  async getAdminEmails(adegaId) {
    try {
      const admins = await User.find({ adegaId, role: { $in: ['admin', 'staff'] } }).select('email').lean();
      return admins.map(u => u.email).filter(Boolean);
    } catch {
      return [];
    }
  }

  async send(tipo, destinatario, mensagem, dados = {}) {
    logger.info(`[NOTIFICACAO] ${tipo} para ${destinatario}: ${mensagem}`);
    await mailService.send(destinatario, `[Rei da Adega] ${tipo}`, `<p>${mensagem}</p>`);
    return { enviado: true, tipo, destinatario };
  }

  async estoqueBaixo(produto, adegaId) {
    const msg = `Estoque baixo: ${produto.nome} - ${produto.estoque} unidades restantes`;
    logger.warn(`[ESTOQUE] ${msg} (adega: ${adegaId})`);
    try {
      const adega = await Adega.findById(adegaId).select('nome').lean();
      const emails = await this.getAdminEmails(adegaId);
      if (emails.length) {
        await mailService.sendEstoqueBaixo(produto, adega || { nome: 'N/A' }, emails);
      }
    } catch (_) {}
    return { alerta: true, produto: produto.nome, estoque: produto.estoque };
  }

  async campanhaPublicada(campanha, adegaId) {
    const msg = `Campanha publicada: ${campanha.nome}`;
    logger.info(`[CAMPANHA] ${msg} (adega: ${adegaId})`);
    try {
      const adega = await Adega.findById(adegaId).select('nome').lean();
      const emails = await this.getAdminEmails(adegaId);
      if (emails.length) {
        await mailService.sendCampanhaPublicada(campanha, adega || { nome: 'N/A' }, emails);
      }
    } catch (_) {}
    return { publicado: true, campanha: campanha.nome };
  }
}

module.exports = new NotificationService();
