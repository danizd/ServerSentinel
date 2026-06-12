@echo off
title ServerSentinel v1.0.0
color 0A

echo ========================================
echo   ServerSentinel - Honeypot System
echo ========================================
echo.

:: Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no encontrado. Instala desde https://nodejs.org
    pause
    exit /b 1
)

:: Verificar .env
if not exist .env (
    echo [INFO] Copiando configuracion por defecto...
    copy .env.example .env >nul
)

:: Verificar node_modules
if not exist node_modules (
    echo [INFO] Instalando dependencias...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Fallo al instalar dependencias
        pause
        exit /b 1
    )
    echo.
)

:: Crear directorios necesarios
if not exist data mkdir data
if not exist blog mkdir blog
if not exist logs mkdir logs

echo [OK] Iniciando ServerSentinel...
echo.

node src/index.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] El servidor se detuvo con errores
    pause
)
