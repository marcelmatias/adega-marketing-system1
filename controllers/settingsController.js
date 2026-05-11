const Adega = require('../models/Adega');
const youtubeService = require('../services/youtubeService');
const logger = require('../utils/logger');

exports.exibir = async (req, res) => {
  try {
    const adega = await Adega.findById(req.session.user.adegaId);
    if (!adega) {
      req.flash('error', 'Adega nao encontrada');
      return res.redirect('/admin');
    }

    const youtubeConectado = !!(adega.youtubeConfig.refreshToken);
    const youtubeClientIdOk = !!(adega.youtubeConfig.clientId);
    const instagramConectado = !!(adega.instagramConfig.accessToken);
    const instagramAppOk = !!(adega.instagramConfig.facebookAppId);

    const success = req.query.success;
    const error = req.query.error;
    const detail = req.query.detail;

    let flashMsg = null;
    if (success === 'oauth_ok') flashMsg = { type: 'success', text: 'YouTube conectado com sucesso! O refresh token foi salvo.' };
    else if (success === 'ig_oauth_ok') flashMsg = { type: 'success', text: 'Instagram conectado com sucesso! O token foi salvo.' };
    else if (error === 'oauth_negado') flashMsg = { type: 'warning', text: 'Autorizacao do YouTube cancelada.' };
    else if (error === 'oauth_falhou') flashMsg = { type: 'danger', text: 'Falha ao iniciar conexao com YouTube.' };
    else if (error === 'oauth_invalido') flashMsg = { type: 'danger', text: 'Callback OAuth invalido.' };
    else if (error === 'oauth_sessao') flashMsg = { type: 'danger', text: 'Sessao expirada. Faca login novamente.' };
    else if (error === 'oauth_erro') flashMsg = { type: 'danger', text: 'Erro ao processar callback do YouTube.' };
    else if (error === 'oauth_adega_nao_encontrada') flashMsg = { type: 'danger', text: 'Adega nao encontrada.' };
    else if (error === 'ig_oauth_negado') flashMsg = { type: 'warning', text: 'Autorizacao do Instagram cancelada.' };
    else if (error === 'ig_sem_app') flashMsg = { type: 'danger', text: 'Configure o Facebook App ID antes de conectar o Instagram.' };
    else if (error === 'ig_oauth_falhou') flashMsg = { type: 'danger', text: 'Falha ao iniciar conexao com Instagram.' };
    else if (error === 'ig_oauth_invalido') flashMsg = { type: 'danger', text: 'Callback OAuth invalido.' };
    else if (error === 'ig_oauth_sessao') flashMsg = { type: 'danger', text: 'Sessao expirada. Faca login novamente.' };
    else if (error === 'ig_oauth_adega') flashMsg = { type: 'danger', text: 'Adega nao encontrada.' };
    else if (error === 'ig_oauth_erro') flashMsg = { type: 'danger', text: 'Erro ao conectar Instagram: ' + (detail || 'tente novamente.') };

    let youtubePlaylists = [];
    let youtubeChannels = [];
    if (youtubeConectado && !adega.youtubeConfig.mock) {
      try {
        youtubePlaylists = await youtubeService.listarPlaylists(adega.youtubeConfig);
      } catch (_) {}
      try {
        youtubeChannels = await youtubeService.listarCanais(adega.youtubeConfig);
      } catch (_) {}
    }

    res.render('pages/configuracoes', {
      adega,
      youtubeConectado,
      youtubeClientIdOk,
      youtubePlaylists,
      youtubeChannels,
      instagramConectado,
      instagramAppOk,
      flash: flashMsg,
    });
  } catch (err) {
    logger.error(`Erro ao exibir configuracoes: ${err.message}`);
    req.flash('error', 'Erro ao carregar configuracoes');
    res.redirect('/admin');
  }
};

exports.salvar = async (req, res) => {
  try {
    const adega = await Adega.findById(req.session.user.adegaId);
    if (!adega) {
      req.flash('error', 'Adega nao encontrada');
      return res.redirect('/admin/configuracoes');
    }

    const { nome, endereco, whatsapp, telefone, email, youtubeConfig, canvaConfig, instagramConfig } = req.body;

    if (nome !== undefined) adega.nome = nome.trim();
    if (whatsapp !== undefined) adega.whatsapp = whatsapp;
    if (telefone !== undefined) adega.telefone = telefone;
    if (email !== undefined) adega.email = email;
    if (endereco) {
      if (endereco.logradouro !== undefined) adega.endereco.logradouro = endereco.logradouro;
      if (endereco.numero !== undefined) adega.endereco.numero = endereco.numero;
      if (endereco.bairro !== undefined) adega.endereco.bairro = endereco.bairro;
      if (endereco.cidade !== undefined) adega.endereco.cidade = endereco.cidade;
      if (endereco.estado !== undefined) adega.endereco.estado = endereco.estado;
      if (endereco.cep !== undefined) adega.endereco.cep = endereco.cep;
    }

    if (req.file) {
      adega.logo = '/uploads/adega/' + req.file.filename;
    }

    if (youtubeConfig) {
      if (youtubeConfig.apiKey !== undefined) adega.youtubeConfig.apiKey = youtubeConfig.apiKey;
      if (youtubeConfig.clientId !== undefined) adega.youtubeConfig.clientId = youtubeConfig.clientId;
      if (youtubeConfig.clientSecret !== undefined) adega.youtubeConfig.clientSecret = youtubeConfig.clientSecret;
      if (youtubeConfig.refreshToken !== undefined) adega.youtubeConfig.refreshToken = youtubeConfig.refreshToken;
      adega.youtubeConfig.mock = youtubeConfig.mock === 'true' || youtubeConfig.mock === true;
      if (youtubeConfig.playlistId !== undefined) adega.youtubeConfig.playlistId = youtubeConfig.playlistId;
      if (youtubeConfig.channelId !== undefined) adega.youtubeConfig.channelId = youtubeConfig.channelId;
    }

    if (canvaConfig) {
      if (canvaConfig.apiKey !== undefined) adega.canvaConfig.apiKey = canvaConfig.apiKey;
      if (canvaConfig.apiSecret !== undefined) adega.canvaConfig.apiSecret = canvaConfig.apiSecret;
      adega.canvaConfig.mock = canvaConfig.mock === 'true' || canvaConfig.mock === true;
      if (canvaConfig.folderId !== undefined) adega.canvaConfig.folderId = canvaConfig.folderId;
      if (canvaConfig.brandTemplateId !== undefined) adega.canvaConfig.brandTemplateId = canvaConfig.brandTemplateId;
    }

    if (instagramConfig) {
      if (instagramConfig.igUserId !== undefined) adega.instagramConfig.igUserId = instagramConfig.igUserId;
      if (instagramConfig.accessToken !== undefined) adega.instagramConfig.accessToken = instagramConfig.accessToken;
      if (instagramConfig.facebookAppId !== undefined) adega.instagramConfig.facebookAppId = instagramConfig.facebookAppId;
      if (instagramConfig.facebookAppSecret !== undefined) adega.instagramConfig.facebookAppSecret = instagramConfig.facebookAppSecret;
      adega.instagramConfig.mock = instagramConfig.mock === 'true' || instagramConfig.mock === true;
    }

    await adega.save();
    youtubeService.setAdegaConfig(adega.youtubeConfig);
    logger.info(`Configuracoes atualizadas: ${adega.nome}`);
    req.flash('success', 'Configuracoes salvas com sucesso');
    res.redirect('/admin/configuracoes');
  } catch (err) {
    logger.error(`Erro ao salvar configuracoes: ${err.message}`);
    req.flash('error', 'Erro ao salvar configuracoes');
    res.redirect('/admin/configuracoes');
  }
};

exports.criarPlaylist = async (req, res) => {
  try {
    const { titulo } = req.body;
    if (!titulo || !titulo.trim()) {
      req.flash('error', 'Nome da playlist obrigatorio');
      return res.redirect('/admin/configuracoes');
    }
    const adega = await Adega.findById(req.session.user.adegaId);
    if (!adega) {
      req.flash('error', 'Adega nao encontrada');
      return res.redirect('/admin/configuracoes');
    }
    const playlist = await youtubeService.criarPlaylist(titulo.trim(), '', 'unlisted', adega.youtubeConfig);
    adega.youtubeConfig.playlistId = playlist.id;
    await adega.save();
    youtubeService.setAdegaConfig(adega.youtubeConfig);
    logger.info(`Playlist criada: ${playlist.title} (${playlist.id})`);
    req.flash('success', `Playlist "${playlist.title}" criada e selecionada.`);
    res.redirect('/admin/configuracoes');
  } catch (err) {
    logger.error(`Erro ao criar playlist: ${err.message}`);
    req.flash('error', 'Erro ao criar playlist: ' + err.message);
    res.redirect('/admin/configuracoes');
  }
};
