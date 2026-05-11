const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
const stream = fs.createWriteStream(logFile, { flags: 'a' });

const logger = {
  info: (msg) => {
    const line = `[${new Date().toISOString()}] [INFO] ${msg}`;
    console.log(line);
    stream.write(line + '\n');
  },
  warn: (msg) => {
    const line = `[${new Date().toISOString()}] [WARN] ${msg}`;
    console.warn(line);
    stream.write(line + '\n');
  },
  error: (msg) => {
    const line = `[${new Date().toISOString()}] [ERROR] ${msg}`;
    console.error(line);
    stream.write(line + '\n');
  },
};

module.exports = logger;
