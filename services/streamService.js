const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
const logger = require('../utils/logger');

let ffmpegProcess = null;
let currentRtmpUrl = null;
let currentStreamKey = null;

function getActiveStreamInfo() {
  if (!ffmpegProcess) return null;
  return { rtmpUrl: currentRtmpUrl, streamKey: currentStreamKey, pid: ffmpegProcess.pid };
}

async function startStream(slidesDir, rtmpUrl, streamKey) {
  if (ffmpegProcess) {
    logger.warn('Stream ja em andamento. Parando primeiro...');
    await stopStream();
  }

  const slides = fs.readdirSync(slidesDir).filter(f => f.endsWith('.png')).sort();
  if (slides.length === 0) {
    throw new Error('Nenhum slide disponivel para transmissao');
  }

  const rtmpFull = `${rtmpUrl}/${streamKey}`;
  currentRtmpUrl = rtmpUrl;
  currentStreamKey = streamKey;

  const inputPattern = path.join(slidesDir, 'slide_%03d.png');

  return new Promise((resolve, reject) => {
    const args = [
      '-stream_loop', '-1',
      '-framerate', '1/8',
      '-i', inputPattern,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'ultrafast',
      '-b:v', '2000k',
      '-maxrate', '2000k',
      '-bufsize', '4000k',
      '-g', '60',
      '-f', 'flv',
      rtmpFull,
    ];

    logger.info(`FFmpeg iniciando: ${ffmpegPath} ${args.join(' ')}`);

    ffmpegProcess = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    ffmpegProcess.stdout.on('data', d => logger.debug(`[FFmpeg] ${d}`));
    ffmpegProcess.stderr.on('data', d => logger.debug(`[FFmpeg] ${d}`));

    ffmpegProcess.on('error', err => {
      logger.error(`Erro FFmpeg: ${err.message}`);
      ffmpegProcess = null;
      reject(err);
    });

    ffmpegProcess.on('exit', (code, signal) => {
      logger.info(`FFmpeg encerrado (codigo=${code}, signal=${signal})`);
      ffmpegProcess = null;
    });

    setTimeout(() => {
      if (ffmpegProcess) resolve(true);
      else reject(new Error('FFmpeg falhou ao iniciar'));
    }, 2000);
  });
}

async function stopStream() {
  if (!ffmpegProcess) return;
  try {
    ffmpegProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 3000));
    if (ffmpegProcess) {
      ffmpegProcess.kill('SIGKILL');
      ffmpegProcess = null;
    }
  } catch (err) {
    logger.error(`Erro parar FFmpeg: ${err.message}`);
  }
  currentRtmpUrl = null;
  currentStreamKey = null;
}

module.exports = { startStream, stopStream, getActiveStreamInfo };
