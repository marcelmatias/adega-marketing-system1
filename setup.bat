@echo off
title Adega Marketing System - Setup Docker

echo ========================================
echo   Adega Marketing System - Setup Docker
echo ========================================
echo.

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Docker nao encontrado. Instale em https://docs.docker.com/desktop/setup/install/windows-install/
    pause
    exit /b 1
)

echo [1/3] Copiando .env (se nao existir)...
if not exist .env (
    copy .env.example .env >nul
    echo   .env criado a partir de .env.example
) else (
    echo   .env ja existe
)

echo [2/3] Build da imagem...
docker compose build
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Falha no build
    pause
    exit /b 1
)

echo [3/3] Subindo containers...
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Falha ao subir containers
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Pronto! Acesse:
echo   http://localhost:3000
echo.
echo   Admin: admin@adega.com / 123456
echo   Staff: staff@adega.com / 123456
echo   Viewer: viewer@adega.com / 123456
echo ========================================
pause
