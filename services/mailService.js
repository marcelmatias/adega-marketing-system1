const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class MailService {
  constructor() {
    this.transporter = null;
    this.mock = true;
    this.config = { host: '', port: 587, user: '', pass: '', from: '' };
  }

  setConfig(smtpHost, smtpPort, smtpUser, smtpPass, emailFrom) {
    this.config = {
      host: smtpHost || '',
      port: smtpPort || 587,
      user: smtpUser || '',
      pass: smtpPass || '',
      from: emailFrom || '',
    };
    this.mock = !this.config.host || !this.config.user || !this.config.pass;
    if (!this.mock) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.port === 465,
        auth: { user: this.config.user, pass: this.config.pass },
      });
      logger.info(`MailService configurado: ${this.config.host}:${this.config.port}`);
    } else {
      this.transporter = null;
      logger.info('MailService em modo mock (sem credenciais SMTP)');
    }
  }

  async send(to, subject, html) {
    if (this.mock) {
      logger.info(`[MAIL MOCK] Para: ${to} | Assunto: ${subject}`);
      return { enviado: true, mock: true, to, subject };
    }
    try {
      const info = await this.transporter.sendMail({
        from: this.config.from || this.config.user,
        to,
        subject,
        html,
      });
      logger.info(`Email enviado para ${to}: ${info.messageId}`);
      return { enviado: true, messageId: info.messageId, to, subject };
    } catch (err) {
      logger.error(`Erro ao enviar email para ${to}: ${err.message}`);
      return { enviado: false, error: err.message, to, subject };
    }
  }

  async sendEstoqueBaixo(produto, adega, adminEmails) {
    const subject = `[Rei da Adega] Estoque Baixo - ${produto.nome}`;
    const html = `
      <h2>Alerta de Estoque Baixo</h2>
      <p><strong>Adega:</strong> ${adega.nome || 'N/A'}</p>
      <p><strong>Produto:</strong> ${produto.nome}</p>
      <p><strong>Estoque Atual:</strong> ${produto.estoque} ${produto.unidade || 'un'}</p>
      <p><strong>Estoque Minimo:</strong> ${produto.estoqueMinimo} ${produto.unidade || 'un'}</p>
      <hr>
      <p style="color:#666;">Sistema Rei da Adega</p>
    `;
    const results = [];
    for (const email of adminEmails) {
      results.push(await this.send(email, subject, html));
    }
    return results;
  }

  async sendCampanhaPublicada(campanha, adega, adminEmails) {
    const subject = `[Rei da Adega] Campanha Publicada - ${campanha.nome}`;
    const html = `
      <h2>Campanha Publicada</h2>
      <p><strong>Adega:</strong> ${adega.nome || 'N/A'}</p>
      <p><strong>Campanha:</strong> ${campanha.nome}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <hr>
      <p style="color:#666;">Sistema Rei da Adega</p>
    `;
    const results = [];
    for (const email of adminEmails) {
      results.push(await this.send(email, subject, html));
    }
    return results;
  }

  async sendAssinaturaAtiva(usuario, plano, pagamento) {
    const subject = `[Rei da Adega] Assinatura Ativa - ${plano.nome}`;
    const html = `
      <h2>Assinatura Ativada</h2>
      <p><strong>Usuario:</strong> ${usuario.nome || usuario.email}</p>
      <p><strong>Plano:</strong> ${plano.nome}</p>
      <p><strong>Valor:</strong> R$ ${(pagamento.valor || 0).toFixed(2)}</p>
      <p><strong>Pagamento:</strong> ${pagamento.gateway}</p>
      <hr>
      <p style="color:#666;">Sistema Rei da Adega</p>
    `;
    return this.send(usuario.email, subject, html);
  }
}

module.exports = new MailService();
