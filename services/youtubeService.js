const { google } = require('googleapis');
const crypto = require('crypto');
const logger = require('../utils/logger');

class YouTubeService {
  constructor() {
    this.mock = true;
    this.clientId = '';
    this.clientSecret = '';
    this.refreshToken = '';
    this.oauth2Client = null;
    this.youtube = null;
    this.redirectUri = '';
  }

  setAdegaConfig(adegaConfig) {
    if (!adegaConfig) return;
    this.mock = adegaConfig.mock !== undefined ? adegaConfig.mock : true;
    this.clientId = adegaConfig.clientId || '';
    this.clientSecret = adegaConfig.clientSecret || '';
    this.refreshToken = adegaConfig.refreshToken || '';
    if (this.mock || !this.clientId || !this.clientSecret) {
      this.oauth2Client = null;
      this.youtube = null;
      return;
    }
    this.oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
    if (this.refreshToken) {
      this.oauth2Client.setCredentials({ refresh_token: this.refreshToken });
    }
    this.youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
  }

  _getRedirectUri(baseUrl) {
    return `${baseUrl || process.env.BASE_URL || 'http://localhost:3000'}/auth/youtube/callback`;
  }

  getAuthUrl(session, adegaConfig, baseUrl) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Client ID e Client Secret obrigatorios. Configure nas Configuracoes.');
    }
    const state = crypto.randomBytes(32).toString('hex');
    session.youtubeOAuthState = state;
    const redirectUri = this._getRedirectUri(baseUrl);
    const client = new google.auth.OAuth2(this.clientId, this.clientSecret, redirectUri);
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
      state,
    });
  }

  async handleCallback(code, state, session, baseUrl) {
    if (state !== session.youtubeOAuthState) {
      throw new Error('State mismatch. Possivel ataque CSRF.');
    }
    delete session.youtubeOAuthState;
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Client ID e Client Secret nao configurados.');
    }
    const redirectUri = this._getRedirectUri(baseUrl);
    const client = new google.auth.OAuth2(this.clientId, this.clientSecret, redirectUri);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error('Nenhum refresh_token recebido. Use prompt=consent e access_type=offline.');
    }
    return tokens;
  }

  async uploadVideo(titulo, descricao, videoBuffer, visibility = 'public', adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      logger.info(`[YOUTUBE MOCK] Video publicado: ${titulo}`);
      return {
        id: `mock_video_${Date.now()}`,
        title: titulo,
        url: `https://youtube.com/watch?v=mock_${Date.now()}`,
        status: 'publicado',
      };
    }
    try {
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: { title: titulo, description: descricao },
          status: { privacyStatus: visibility },
        },
        media: { body: videoBuffer },
      });
      logger.info(`Video enviado YouTube: ${response.data.id}`);
      return response.data;
    } catch (err) {
      logger.error(`Erro YouTube upload: ${err.message}`);
      throw new Error('Falha ao enviar video para YouTube');
    }
  }

  async criarPlaylist(titulo, descricao, visibility = 'unlisted', adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      logger.info(`[YOUTUBE MOCK] Playlist criada: ${titulo}`);
      return { id: `mock_playlist_${Date.now()}`, title: titulo };
    }
    try {
      const response = await this.youtube.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: { title: titulo, description: descricao },
          status: { privacyStatus: visibility },
        },
      });
      return response.data;
    } catch (err) {
      logger.error(`Erro criar playlist: ${err.message}`);
      throw new Error('Falha ao criar playlist');
    }
  }

  async adicionarVideoPlaylist(playlistId, videoId, adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      logger.info(`[YOUTUBE MOCK] Video ${videoId} adicionado a playlist ${playlistId}`);
      return { success: true };
    }
    try {
      await this.youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } },
        },
      });
      return { success: true };
    } catch (err) {
      logger.error(`Erro adicionar playlist: ${err.message}`);
      throw new Error('Falha ao adicionar video na playlist');
    }
  }

  async listarVideosPlaylist(playlistId, adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      return { items: [] };
    }
    try {
      const response = await this.youtube.playlistItems.list({
        part: ['snippet'],
        playlistId,
        maxResults: 50,
      });
      return response.data;
    } catch (err) {
      logger.error(`Erro listar playlist: ${err.message}`);
      return { items: [] };
    }
  }

  async listarPlaylists(adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      return [];
    }
    try {
      const response = await this.youtube.playlists.list({
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: 50,
      });
      return (response.data.items || []).map(p => ({
        id: p.id,
        title: p.snippet.title,
        itemCount: p.contentDetails.itemCount,
      }));
    } catch (err) {
      logger.error(`Erro listar playlists: ${err.message}`);
      return [];
    }
  }

  async criarLiveBroadcast(titulo, descricao, adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      logger.info(`[YOUTUBE MOCK] Live broadcast criada: ${titulo}`);
      return {
        id: `mock_broadcast_${Date.now()}`,
        streamId: `mock_stream_${Date.now()}`,
        rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
        streamKey: `mock_${Date.now()}`,
        watchUrl: `https://youtube.com/watch?v=mock_live_${Date.now()}`,
      };
    }
    try {
      const broadcastResponse = await this.youtube.liveBroadcasts.insert({
        part: ['snippet', 'contentDetails', 'status'],
        requestBody: {
          snippet: {
            title: titulo,
            description: descricao,
            scheduledStartTime: new Date().toISOString(),
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: false,
            recordFromStart: true,
            enableDvr: true,
            enableEmbed: true,
          },
          status: {
            privacyStatus: 'unlisted',
            selfDeclaredMadeForKids: false,
          },
        },
      });
      const broadcastId = broadcastResponse.data.id;

      const streamResponse = await this.youtube.liveStreams.insert({
        part: ['snippet', 'cdn', 'contentDetails', 'status'],
        requestBody: {
          snippet: { title: `Stream ${titulo}` },
          cdn: {
            format: '1080p',
            ingestionType: 'rtmp',
            resolution: '1080p',
            frameRate: '30fps',
          },
        },
      });
      const streamId = streamResponse.data.id;
      const streamKey = streamResponse.data.cdn.ingestionInfo.streamName;
      const rtmpUrl = streamResponse.data.cdn.ingestionInfo.ingestionAddress;

      await this.youtube.liveBroadcasts.bind({
        part: ['id', 'contentDetails'],
        requestBody: { streamId, id: broadcastId },
      });

      logger.info(`Live criada: ${broadcastId}`);
      return {
        id: broadcastId,
        streamId,
        rtmpUrl,
        streamKey,
        watchUrl: `https://youtube.com/watch?v=${broadcastId}`,
      };
    } catch (err) {
      const detail = err.errors?.[0]?.message || err.response?.data?.error?.message || err.message || '';
      logger.error(`Erro criar live: ${detail}`);
      if (detail.toLowerCase().includes('live streaming') || detail.includes('liveEnabled')) {
        throw new Error('Conta do YouTube nao habilitada para live streaming. Ative em https://studio.youtube.com/ -> Criar -> Fazer live (pode levar ate 24h para liberar).');
      }
      throw new Error('Falha ao criar live no YouTube: ' + detail);
    }
  }

  async listarCanais(adegaConfig) {
    if (adegaConfig) this.setAdegaConfig(adegaConfig);
    if (this.mock) {
      return [];
    }
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });
      return (response.data.items || []).map(c => ({
        id: c.id,
        title: c.snippet.title,
      }));
    } catch (err) {
      logger.error(`Erro listar canais: ${err.message}`);
      return [];
    }
  }
}

module.exports = new YouTubeService();
