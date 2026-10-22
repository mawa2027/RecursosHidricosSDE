#!/bin/bash

# Script de Setup Automático - Recursos Hídricos SDE
# Uso: bash setup.sh (en Mac/Linux)

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  SETUP BASE DE DATOS - Recursos Hídricos SDE${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}\n"

# Función para imprimir con color
log() {
    echo -e "${BLUE}→${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# 1. Verificar Node.js
log "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado"
    exit 1
fi
success "Node.js $(node -v) encontrado"

# 2. Verificar npm
log "Verificando npm..."
if ! command -v npm &> /dev/null; then
    error "npm no está instalado"
    exit 1
fi
success "npm $(npm -v) encontrado"

# 3. Verificar estructura
log "Verificando estructura del proyecto..."
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    error "No se encontró carpeta backend o frontend"
    exit 1
fi
success "Estructura correcta"

# 4. Instalar dependencias backend
log "Instalando dependencias del backend..."
cd backend
npm install > /dev/null 2>&1
success "Backend listo"

# 5. Instalar dependencias frontend
log "Instalando dependencias del frontend..."
cd ../frontend
npm install > /dev/null 2>&1
success "Frontend listo"

# 6. Volver a raíz
cd ..

# 7. Ejecutar diagnóstico
log "Ejecutando diagnóstico de base de datos..."
cd backend
echo ""
node diagnostico-bd.js
echo ""

# 8. Preguntar si continuar
log "¿Deseas iniciar los servidores? (S/n)"
read -r response
if [[ ! "$response" =~ ^[Ss]$ ]] && [ ! -z "$response" ]; then
    warning "Setup completado. Ejecuta manualmente:"
    echo "  Terminal 1: cd backend && npm run dev"
    echo "  Terminal 2: cd frontend && npm run dev"
    exit 0
fi

# 9. Iniciar backend
log "Iniciando backend en http://localhost:4000..."
npm run dev &
BACKEND_PID=$!
sleep 2

# 10. Iniciar frontend
log "Iniciando frontend en http://localhost:3000..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Servidores iniciados!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}\n"

echo -e "🌐 Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "🔌 Backend:  ${BLUE}http://localhost:4000${NC}\n"

log "Presiona Ctrl+C para detener los servidores\n"

# Mantener script corriendo
wait
