#!/bin/sh
set -e

echo "==> Validando variaveis de ambiente..."
if [ -z "$JWT_SECRET" ]; then
  echo "ERRO: JWT_SECRET nao definido. Configure a variavel de ambiente JWT_SECRET."
  exit 1
fi
if [ -z "$SESSION_SECRET" ]; then
  echo "ERRO: SESSION_SECRET nao definido. Configure a variavel de ambiente SESSION_SECRET."
  exit 1
fi
if [ -z "$MONGODB_URI" ]; then
  echo "ERRO: MONGODB_URI nao definido. Configure a variavel de ambiente MONGODB_URI."
  exit 1
fi

echo "==> Aguardando MongoDB..."
until node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('MongoDB pronto');
    process.exit(0);
  }).catch(() => process.exit(1));
" 2>/dev/null; do
  sleep 2
done

echo "==> Verificando se o banco ja possui dados..."
JA_POSSui=$(node -e "
  const mongoose = require('mongoose');
  const Adega = require('./models/Adega');
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const count = await Adega.countDocuments();
    console.log(count > 0 ? 'sim' : 'nao');
    process.exit(0);
  });
" 2>/dev/null)

if [ "$JA_POSSui" = "nao" ]; then
  echo "==> Banco vazio. Executando seed..."
  node seed/seed.js
else
  echo "==> Banco ja possui dados. Seed ignorado."
fi

echo "==> Iniciando aplicacao..."
exec node server.js
