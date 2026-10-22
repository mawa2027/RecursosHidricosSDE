# --- Etapa 1: construir la aplicación con Vite ---
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
# Se instalan también las herramientas de construcción (Vite, Tailwind, PostCSS).
# Si npm se queja de versiones incompatibles entre librerías, reintenta ignorándolas.
RUN npm install --no-audit --no-fund || npm install --legacy-peer-deps --no-audit --no-fund

COPY . .

# Dirección de la API. Vite la "graba" al construir, así que se pasa acá.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Etapa 2: servir los archivos ya construidos con Nginx ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Puerto donde escucha Nginx (hay que indicarlo también en Coolify)
EXPOSE 80
