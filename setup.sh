#!/bin/bash
set -e

echo "========================================"
echo "  Adega Marketing System - Setup Docker"
echo "========================================"
echo ""

# Verificar se Docker esta instalado
if ! command -v docker &> /dev/null; then
    echo "ERRO: Docker nao encontrado. Instale em https://docs.docker.com/engine/install/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "ERRO: Docker Compose nao encontrado."
    exit 1
fi

echo "[1/3] Copiando .env (se nao existir)..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  .env criado a partir de .env.example"
else
    echo "  .env ja existe"
fi

echo "[2/3] Build da imagem..."
docker compose build

echo "[3/3] Subindo containers..."
docker compose up -d

echo ""
echo "========================================"
echo "  Pronto! Acesse:"
echo "  http://localhost:3000"
echo ""
echo "  Admin: admin@adega.com / 123456"
echo "  Staff: staff@adega.com / 123456"
echo "  Viewer: viewer@adega.com / 123456"
echo "========================================"
