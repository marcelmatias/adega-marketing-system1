const logger = require('../utils/logger');

class NotificationService {
  async send(tipo, destinatario, mensagem, dados = {}) {
    logger.info(`[NOTIFICACAO] ${tipo} para ${destinatario}: ${mensagem}`);
    return { enviado: true, tipo, destinatario };
  }

  async estoqueBaixo(produto, adegaId) {
    const msg = `Estoque baixo: ${produto.nome} - ${produto.estoque} unidades restantes`;
    logger.warn(`[ESTOQUE] ${msg} (adega: ${adegaId})`);
    return { alerta: true, produto: produto.nome, estoque: produto.estoque };
  }

  async campanhaPublicada(campanha, adegaId) {
    const msg = `Campanha publicada: ${campanha.nome}`;
    logger.info(`[CAMPANHA] ${msg} (adega: ${adegaId})`);
    return { publicado: true, campanha: campanha.nome };
  }
}

module.exports = new NotificationService();
