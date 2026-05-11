const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'campanhas');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp|bmp/;
  const videoTypes = /mp4|webm|avi|mov|mkv/;
  const audioTypes = /mp3|wav|ogg|aac|flac|m4a/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (imageTypes.test(ext) || videoTypes.test(ext) || audioTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo nao suportado. Use imagens (jpg,png,gif,webp), videos (mp4,webm) ou audio (mp3,wav,ogg).'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

module.exports = upload;
