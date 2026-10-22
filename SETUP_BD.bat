@echo off
REM Script para instalar y verificar la Base de Datos en Windows
REM Recursos Hidricos SDE - Setup BD

setlocal enabledelayedexpansion
cls

echo.
echo ============================================================
echo   SETUP BASE DE DATOS - Recursos Hidricos SDE
echo ============================================================
echo.

REM Colores (necesita escribir caracteres ANSI)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RESET=[0m"

REM Detectar si MySQL está corriendo
echo Verificando si MySQL esta ejecutandose...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo %GREEN%[OK]%RESET% MySQL esta ejecutandose
) else (
    echo %RED%[ERROR]%RESET% MySQL NO esta ejecutandose
    echo.
    echo Opciones:
    echo 1. Abre Services ^(Win+R, escribe: services.msc^)
    echo 2. Busca "MySQL80" o similar
    echo 3. Click derecho ^> Start
    echo.
    pause
    goto end
)

REM Navegar a la carpeta backend
cd /d "%~dp0backend"
if not exist "package.json" (
    echo %RED%[ERROR]%RESET% No se encontro package.json
    echo Asegurate de estar en la carpeta correcta
    pause
    goto end
)

echo.
echo Ejecutando diagnostico de base de datos...
echo.
node diagnostico-bd.js

if "%ERRORLEVEL%"=="0" (
    echo.
    echo %GREEN%[OK]%RESET% Diagnostico completado
    echo.
    echo Proximos pasos:
    echo.
    echo Terminal 1:
    echo   cd backend
    echo   npm run dev
    echo.
    echo Terminal 2:
    echo   cd frontend
    echo   npm run dev
    echo.
) else (
    echo.
    echo %RED%[ERROR]%RESET% Ocurrio un problema
    echo Verifica el output arriba para detalles
    pause
)

:end
echo.
pause
