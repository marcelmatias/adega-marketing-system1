const axios = require('axios');
const canvaConfig = require('../config/canva');
const logger = require('../utils/logger');

class CanvaService {
  constructor() {
    this.mock = canvaConfig.mock;
    this.apiKey = canvaConfig.apiKey;
    this.baseUrl = canvaConfig.baseUrl;
  }

  _getConfig(adegaConfig) {
    if (!adegaConfig) return { mock: this.mock, apiKey: this.apiKey };
    return {
      mock: adegaConfig.mock !== undefined ? adegaConfig.mock : this.mock,
      apiKey: adegaConfig.apiKey || this.apiKey,
    };
  }

  async criarDesign(titulo, tipo = 'video', adegaConfig) {
    const cfg = this._getConfig(adegaConfig);
    if (cfg.mock) {
      logger.info(`[CANVA MOCK] Design criado: ${titulo} (${tipo})`);
      return {
        id: `mock_design_${Date.now()}`,
        title: titulo,
        type: tipo,
        url: `https://canva.com/mock/design/${Date.now()}`,
        status: 'rascunho',
      };
    }
    try {
      const response = await axios.post(`${this.baseUrl}/v1/designs`, {
        title: titulo,
        design_type: tipo,
      }, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      logger.info(`Design Canva criado: ${response.data.id}`);
      return response.data;
    } catch (err) {
      logger.error(`Erro Canva API: ${err.message}`);
      throw new Error('Falha ao criar design no Canva');
    }
  }

  async exportarDesign(designId, format = 'mp4', adegaConfig) {
    const cfg = this._getConfig(adegaConfig);
    if (cfg.mock) {
      logger.info(`[CANVA MOCK] Exportacao iniciada: ${designId}`);
      return {
        id: `mock_export_${Date.now()}`,
        status: 'concluido',
        url: `https://mock.canva.export/${designId}.${format}`,
      };
    }
    try {
      const response = await axios.post(`${this.baseUrl}/v1/designs/${designId}/exports`, {
        format,
        quality: 'high',
      }, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      return response.data;
    } catch (err) {
      logger.error(`Erro exportacao Canva: ${err.message}`);
      throw new Error('Falha ao exportar design');
    }
  }

  async listarDesigns(pastaId, adegaConfig) {
    const cfg = this._getConfig(adegaConfig);
    if (cfg.mock) {
      return { designs: [], total: 0 };
    }
    try {
      const response = await axios.get(`${this.baseUrl}/v1/designs`, {
        params: { folder_id: pastaId },
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      return response.data;
    } catch (err) {
      logger.error(`Erro listar designs: ${err.message}`);
      return { designs: [], total: 0 };
    }
  }
}

module.exports = new CanvaService();
