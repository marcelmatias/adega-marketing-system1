const Adega = require('../models/Adega');
const Product = require('../models/Product');
const youtubeService = require('../services/youtubeService');
const { generateSlides } = require('../services/slideService');
const { startStream, stopStream, getActiveStreamInfo } = require('../services/streamService');
const logger = require('../utils/logger');
const path = require('path');

const SLIDES_DIR = path.join(__dirname, '..', 'public', 'uploads', 'live');

let liveBroadcastId = null;
let liveWatchUrl = null;
let liveStartedAt = null;

exports.iniciar = async (req, res) => {
  try {
    const adega = await Adega.findById(req.adegaId);
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });

    const produtos = await Product.find({ adegaId: req.adegaId, ativo: true }).sort({ nome: 1 });

    await generateSlides(adega, produtos, SLIDES_DIR);

    const adegaConfig = adega.youtubeConfig || {};
    const liveInfo = await youtubeService.criarLiveBroadcast(
      `Adega ${adega.nome} - Ao Vivo`,
      `Transmissao ao vivo da Adega ${adega.nome}. Confira nossos produtos!\n\nNao recomendavel para menores de 18 anos.`,
      adegaConfig,
    );

    liveBroadcastId = liveInfo.id;
    liveWatchUrl = liveInfo.watchUrl;
    liveStartedAt = new Date();

    await startStream(SLIDES_DIR, liveInfo.rtmpUrl, liveInfo.streamKey);

    logger.info(`Live iniciada: ${liveWatchUrl}`);
    res.json({
      broadcastId: liveBroadcastId,
      watchUrl: liveWatchUrl,
      startedAt: liveStartedAt,
    });
  } catch (err) {
    logger.error(`Erro iniciar live: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.parar = async (req, res) => {
  try {
    await stopStream();
    liveBroadcastId = null;
    liveWatchUrl = null;
    liveStartedAt = null;
    logger.info('Live encerrada');
    res.json({ message: 'Live encerrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.status = async (req, res) => {
  const streamInfo = getActiveStreamInfo();
  res.json({
    online: !!streamInfo,
    broadcastId: liveBroadcastId,
    watchUrl: liveWatchUrl,
    startedAt: liveStartedAt,
    streamInfo,
  });
};

exports.regenerarSlides = async (req, res) => {
  try {
    const adega = await Adega.findById(req.adegaId);
    if (!adega) return res.status(404).json({ error: 'Adega nao encontrada' });

    const produtos = await Product.find({ adegaId: req.adegaId, ativo: true }).sort({ nome: 1 });
    await generateSlides(adega, produtos, SLIDES_DIR);

    const streamInfo = getActiveStreamInfo();
    if (streamInfo) {
      await stopStream();
      await startStream(SLIDES_DIR, streamInfo.rtmpUrl, streamInfo.streamKey);
    }

    logger.info('Slides regenerados');
    res.json({ message: 'Slides atualizados', total: produtos.length, liveAtiva: !!streamInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
