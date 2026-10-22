#!/usr/bin/env powershell

<#
.SYNOPSIS
    Script de Setup para Base de Datos - Recursos Hídricos SDE
    
.DESCRIPTION
    Verifica MySQL, diagnostica la BD, e inicia los servidores
    
.EXAMPLE
    .\SETUP_BD.ps1
#>

[CmdletBinding()]
param()

function Write-ColorOutput($color, $message) {
    switch ($color) {
        'Green' { Write-Host $message -ForegroundColor Green }
        'Red' { Write-Host $message -ForegroundColor Red }
        'Yellow' { Write-Host $message -ForegroundColor Yellow }
        'Blue' { Write-Host $message -ForegroundColor Blue }
        'Cyan' { Write-Host $message -ForegroundColor Cyan }
        default { Write-Host $message }
    }
}

function Check-MySQL {
    $mysql = Get-Process mysqld -ErrorAction SilentlyContinue
    if ($mysql) {
        Write-ColorOutput 'Green' "✅ MySQL está ejecutándose"
        return $true
    } else {
        Write-ColorOutput 'Red' "❌ MySQL NO está ejecutándose"
        return $false
    }
}

function Show-Instructions {
    Write-ColorOutput 'Yellow' @"
📋 INSTRUCCIONES PARA INICIAR MYSQL:

Opción 1: Usar Services (GUI)
  1. Presiona: Win + R
  2. Escribe: services.msc
  3. Busca "MySQL80" (u otro nombre MySQL)
  4. Click derecho > Properties
  5. Startup Type: Automatic
  6. Click Start

Opción 2: PowerShell (como Admin)
  1. Abre PowerShell como Administrador
  2. Ejecuta: Start-Service MySQL80
  (Reemplaza MySQL80 con el nombre correcto)

Opción 3: Verificar servicios disponibles
  Get-Service | Where-Object {`$_.Name -like '*MySQL*'}
"@
}

function Run-Diagnostics {
    Write-ColorOutput 'Blue' "`n📊 EJECUTANDO DIAGNÓSTICO DE BASE DE DATOS...`n"
    
    $backendPath = Join-Path $PSScriptRoot "backend"
    if (!(Test-Path $backendPath)) {
        Write-ColorOutput 'Red' "❌ Carpeta backend no encontrada"
        return $false
    }
    
    Push-Location $backendPath
    node diagnostico-bd.js
    $result = $LASTEXITCODE
    Pop-Location
    
    return ($result -eq 0)
}

function Show-NextSteps {
    Write-ColorOutput 'Cyan' @"
═════════════════════════════════════════════════════════════════

✨ PRÓXIMOS PASOS:

En Terminal 1 (Backend):
  cd backend
  npm run dev

En Terminal 2 (Frontend):
  cd frontend
  npm run dev

Luego abre en tu navegador:
  🌐 http://localhost:3000

═════════════════════════════════════════════════════════════════
"@
}

# Main
Clear-Host
Write-ColorOutput 'Cyan' @"
═════════════════════════════════════════════════════════════════
  SETUP BASE DE DATOS - Recursos Hídricos SDE
═════════════════════════════════════════════════════════════════
"@

Write-ColorOutput 'Blue' "`n🔍 Verificando MySQL..."
if (!(Check-MySQL)) {
    Write-ColorOutput 'Red' "`n⚠️  MYSQL NO ESTÁ EJECUTÁNDOSE"
    Show-Instructions
    Read-Host "`nPresiona Enter cuando hayas iniciado MySQL"
    
    if (!(Check-MySQL)) {
        Write-ColorOutput 'Red' "❌ MySQL aún no está ejecutándose"
        exit 1
    }
}

if (!(Run-Diagnostics)) {
    Write-ColorOutput 'Red' "`n❌ Ocurrió un error en el diagnóstico"
    exit 1
}

Show-NextSteps
Read-Host "`nPresiona Enter para continuar"
