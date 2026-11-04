@echo off
title NextQueue - Cloudflare Tunnel Runner
echo =======================================================
echo   Iniciando NextQueue + Cloudflare Tunnel
echo =======================================================
echo.
echo 1. Abrindo Servidor Express + WebSocket (Porta 5000)...
start "NextQueue Backend & Frontend" cmd /k "node backend/src/server.js"
timeout /t 2 /nobreak >nul
echo 2. Iniciando Cloudflare Tunnel...
echo.
cloudflared tunnel --url http://localhost:5000
pause

