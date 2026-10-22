# --- Etapa 1: instalar las librerías ---
# Se usa la imagen completa de Node, que trae las herramientas para compilar.
# Hace falta porque 'bcrypt' es una librería que a veces se compila al instalarse.
FROM node:20 AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# --- Etapa 2: imagen final, más liviana ---
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Carpeta donde el sistema guarda los archivos subidos
RUN mkdir -p /app/uploads

# Puerto donde escucha la API (hay que indicarlo también en Coolify)
EXPOSE 4000

CMD ["node", "server.js"]
