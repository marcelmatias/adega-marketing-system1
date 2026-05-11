const axios = require('axios');
const logger = require('../utils/logger');

const GRAPH_API = 'https://graph.facebook.com/v22.0';

class InstagramService {
  constructor() {
    this.mock = true;
    this.igUserId = '';
    this.accessToken = '';
  }

  setAdegaConfig(config) {
    if (!config) return;
    this.mock = config.mock !== undefined ? config.mock : true;
    this.igUserId = config.igUserId || '';
    this.accessToken = config.accessToken || '';
  }

  async testarConexao(adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      return { ok: true, mock: true, message: 'Modo simulado - sem conexao real' };
    }
    if (!this.igUserId || !this.accessToken) {
      return { ok: false, message: 'ID da conta ou Token de acesso nao preenchidos' };
    }
    try {
      const { data } = await axios.get(`${GRAPH_API}/${this.igUserId}`, {
        params: { fields: 'id,username,name,account_type', access_token: this.accessToken },
      });
      return {
        ok: true,
        mock: false,
        igUserId: data.id,
        username: data.username,
        name: data.name,
        accountType: data.account_type,
        message: `Conta ${data.account_type} conectada: @${data.username}`,
      };
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.message;
      if (detail.includes('does not exist') || detail.includes('missing permissions')) {
        return {
          ok: false,
          message: 'ID da conta invalido ou token sem permissao. Verifique se: (1) o ID e de uma conta Business/Creator do Instagram, (2) o token possui escopos: instagram_basic, instagram_content_publish, pages_manage_engagement, (3) a pagina do Facebook esta vinculada a conta do Instagram.',
          detail,
        };
      }
      return { ok: false, message: detail, detail };
    }
  }

  getAuthUrl(config, state) {
    const appId = config?.facebookAppId;
    if (!appId) throw new Error('Facebook App ID nao configurado');
    const redirectUri = `${config.redirectUri || 'http://localhost:3000'}/auth/instagram/callback`;
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: 'instagram_basic,instagram_content_publish,pages_manage_engagement',
      response_type: 'code',
    });
    return `https://www.facebook.com/v22.0/dialog/oauth?${params}`;
  }

  async handleCallback(code, config) {
    const { facebookAppId: appId, facebookAppSecret: appSecret } = config;
    if (!appId || !appSecret) throw new Error('Facebook App ID ou Secret nao configurado');
    const redirectUri = `${config.redirectUri || 'http://localhost:3000'}/auth/instagram/callback`;

    // Exchange code for short-lived token
    const { data: tokenData } = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      },
    });
    const shortToken = tokenData.access_token;

    // Exchange short-lived for long-lived (60 days)
    const { data: longData } = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortToken,
      },
    });

    const longToken = longData.access_token;
    const expiresIn = longData.expires_in || 5184000; // default 60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get user pages
    const { data: pagesData } = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
      params: { access_token: longToken },
    });

    const pages = pagesData.data || [];
    let igUserId = config.igUserId;
    let pageToken = null;

    // Try to find IG Business Account — match by configured igUserId or take first
    for (const page of pages) {
      try {
        const { data: igData } = await axios.get(`https://graph.facebook.com/v22.0/${page.id}`, {
          params: { fields: 'instagram_business_account', access_token: page.access_token },
        });
        if (igData.instagram_business_account) {
          const foundIgId = igData.instagram_business_account.id;
          if (!igUserId || foundIgId === igUserId) {
            igUserId = foundIgId;
            pageToken = page.access_token;
            break;
          }
        }
      } catch (_) {}
    }

    if (!igUserId) {
      throw new Error('Nenhuma conta Business do Instagram encontrada nas paginas. Verifique se a pagina do Facebook esta vinculada a uma conta Business/Creator do Instagram.');
    }

    return {
      accessToken: pageToken || longToken,
      igUserId,
      tokenExpiresAt: expiresAt,
    };
  }

  async listarPosts(adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      return [];
    }
    try {
      const { data } = await axios.get(`${GRAPH_API}/${this.igUserId}/media`, {
        params: { fields: 'id,caption,media_type,media_url,permalink,timestamp', access_token: this.accessToken },
      });
      return (data.data || []).map(p => ({
        id: p.id,
        legenda: p.caption || '',
        tipo: p.media_type,
        midiaUrl: p.media_url,
        permalink: p.permalink,
        criadoEm: p.timestamp,
      }));
    } catch (err) {
      logger.error(`Erro listar posts Instagram: ${err.message}`);
      return [];
    }
  }

  async criarPost(tipo, midiaUrl, legenda, isReel = false, adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      const mockId = `mock_ig_${Date.now()}`;
      logger.info(`[INSTAGRAM MOCK] Post criado: ${tipo} - ${legenda}`);
      return {
        id: mockId,
        permalink: null,
        status: 'simulado',
      };
    }
    try {
      const mediaEndpoint = isReel ? '/media_reels' : '/media';
      const mediaPayload = {
        image_url: tipo === 'IMAGE' ? midiaUrl : undefined,
        video_url: tipo === 'VIDEO' || tipo === 'REELS' ? midiaUrl : undefined,
        media_type: tipo === 'CAROUSEL' ? 'CAROUSEL' : undefined,
        caption: legenda,
        access_token: this.accessToken,
      };
      if (tipo === 'REELS') {
        mediaPayload.media_type = 'REELS';
      }

      const { data: mediaData } = await axios.post(`${GRAPH_API}/${this.igUserId}${mediaEndpoint}`, mediaPayload);

      const containerId = mediaData.id;

      const publishEndpoint = isReel ? '/media_publish' : '/media_publish';
      const { data: publishData } = await axios.post(`${GRAPH_API}/${this.igUserId}${publishEndpoint}`, {
        creation_id: containerId,
        access_token: this.accessToken,
      });

      const postId = publishData.id;

      const { data: postData } = await axios.get(`${GRAPH_API}/${postId}`, {
        params: { fields: 'id,permalink', access_token: this.accessToken },
      });

      logger.info(`Post Instagram criado: ${postId}`);
      return {
        id: postId,
        permalink: postData.permalink || `https://instagram.com/p/${postId}`,
        status: 'publicado',
      };
    } catch (err) {
      logger.error(`Erro criar post Instagram: ${err.message}`);
      const detail = err.response?.data?.error?.message || err.message;
      if (detail.includes('does not exist') || detail.includes('missing permissions')) {
        throw new Error('Falha ao publicar no Instagram: ID da conta invalido ou token sem permissao. Acesse /admin/configuracoes e clique em "Testar Conexao" para diagnosticar.');
      }
      throw new Error('Falha ao publicar no Instagram: ' + detail);
    }
  }

  async removerPost(postId, adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      logger.info(`[INSTAGRAM MOCK] Post removido: ${postId}`);
      return true;
    }
    try {
      await axios.delete(`${GRAPH_API}/${postId}`, {
        params: { access_token: this.accessToken },
      });
      return true;
    } catch (err) {
      logger.error(`Erro remover post Instagram: ${err.message}`);
      throw new Error('Falha ao remover post do Instagram');
    }
  }
}

module.exports = new InstagramService();
