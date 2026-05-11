const Campaign = require('../models/Campaign');
const path = require('path');
const fs = require('fs');
const { youtubeDl } = require('youtube-dl-exec');
const logger = require('../utils/logger');

exports.uploadMidia = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Campanha nao encontrada' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
    const imageTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp'];
    const tipo = imageTypes.includes(ext) ? 'imagem' : 'video';

    const ordem = campanha.midias.length > 0
      ? Math.max(...campanha.midias.map(m => m.ordem)) + 1
      : 0;

    campanha.midias.push({
      tipo,
      arquivo: `/uploads/campanhas/${req.file.filename}`,
      nomeOriginal: req.file.originalname,
      duracao: tipo === 'imagem' ? campanha.duracaoPadraoImagem : 0,
      ordem,
    });

    await campanha.save();
    logger.info(`Midia adicionada a campanha ${campanha.nome}: ${req.file.originalname}`);
    res.json({ campanha });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
};

exports.importarYoutubeVideo = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    let url = (req.body.url || '').trim();
    if (!url) return res.status(400).json({ error: 'URL do YouTube nao informada' });

    const videoId = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) return res.status(400).json({ error: 'URL do YouTube invalida' });

    const info = await youtubeDl(url, { dumpJson: true, noCheckCertificates: true, noWarnings: true });
    const videoTitle = info.title || 'Video YouTube';
    const lengthSeconds = parseInt(info.duration, 10) || 0;

    const filename = `youtube-${videoId}-${Date.now()}.mp4`;
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'campanhas');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);

    await youtubeDl(url, {
      output: filePath,
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]',
      mergeOutputFormat: 'mp4',
      noCheckCertificates: true,
      preferFreeFormats: true,
      noWarnings: true,
    });

    const ordem = campanha.midias.length > 0
      ? Math.max(...campanha.midias.map(m => m.ordem)) + 1
      : 0;

    campanha.midias.push({
      tipo: 'video',
      arquivo: `/uploads/campanhas/${filename}`,
      nomeOriginal: videoTitle,
      duracao: lengthSeconds,
      ordem,
    });

    await campanha.save();
    logger.info(`YouTube video importado: ${videoTitle} (${lengthSeconds}s)`);
    res.json({ campanha, videoTitle, duration: lengthSeconds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removerMidia = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    const midia = campanha.midias.id(req.params.midiaId);
    if (!midia) return res.status(404).json({ error: 'Midia nao encontrada' });

    const filePath = path.join(__dirname, '..', 'public', midia.arquivo);
    fs.unlink(filePath, () => {});

    campanha.midias.pull({ _id: req.params.midiaId });
    await campanha.save();
    logger.info(`Midia removida da campanha ${campanha.nome}`);
    res.json({ campanha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.reordenarMidias = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    const { ordens } = req.body;
    if (!Array.isArray(ordens)) return res.status(400).json({ error: 'ordens deve ser um array' });

    for (const item of ordens) {
      const midia = campanha.midias.id(item._id);
      if (midia) midia.ordem = item.ordem;
    }

    campanha.midias.sort((a, b) => a.ordem - b.ordem);
    await campanha.save();
    res.json({ campanha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.atualizarDuracao = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    const midia = campanha.midias.id(req.params.midiaId);
    if (!midia) return res.status(404).json({ error: 'Midia nao encontrada' });

    midia.duracao = Math.max(1, req.body.duracao || 5);
    await campanha.save();
    res.json({ campanha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadAudio = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Campanha nao encontrada' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de audio enviado' });
    }

    if (campanha.audio.arquivo) {
      const oldPath = path.join(__dirname, '..', 'public', campanha.audio.arquivo);
      fs.unlink(oldPath, () => {});
    }

    campanha.audio = {
      arquivo: `/uploads/campanhas/${req.file.filename}`,
      nomeOriginal: req.file.originalname,
    };

    await campanha.save();
    logger.info(`Audio adicionado a campanha ${campanha.nome}: ${req.file.originalname}`);
    res.json({ campanha });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
};

exports.removerAudio = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    if (campanha.audio.arquivo) {
      const filePath = path.join(__dirname, '..', 'public', campanha.audio.arquivo);
      fs.unlink(filePath, () => {});
    }
    campanha.audio = { arquivo: '', nomeOriginal: '' };
    await campanha.save();
    res.json({ campanha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleTV = async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, adegaId: req.adegaId });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    campanha.ativoNaTV = !campanha.ativoNaTV;
    await campanha.save();
    logger.info(`Campanha ${campanha.nome} ativoNaTV = ${campanha.ativoNaTV}`);
    res.json({ campanha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
