# Guia de Despliegue y Configuracion

## Requisitos del Servidor

### Software Requerido

| Software | Version Minima | Proposito |
|---|---|---|
| Node.js | 18.x | Runtime para backend y build de frontend |
| npm | 9.x | Gestor de paquetes |
| MySQL | 8.0 | Base de datos |

### Recursos Minimos Recomendados

| Recurso | Desarrollo | Produccion |
|---|---|---|
| CPU | 1 core | 2 cores |
| RAM | 1 GB | 2 GB |
| Disco | 1 GB | 10 GB (incluye uploads) |

## Configuracion Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone https://github.com/marcoib-dev/RecursosHidricosSDE.git
cd RecursosHidricosSDE
```

### 2. Configurar MySQL

Asegurarse de que MySQL este corriendo y crear la base de datos:

```bash
# Opcion A: Usar el script SQL directamente
mysql -u root -p < backend/database.sql

# Opcion B: Usar el script de inicializacion de Node.js
cd backend
npm install
npm run db:init
npm run db:seed
```

### 3. Variables de Entorno

Crear el archivo `backend/.env`:

```env
# ─── Base de Datos ───────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=recursos_hidricos_sde

# ─── Autenticacion ──────────────────────────
JWT_SECRET=clave_secreta_aleatoria_larga_y_segura
JWT_EXPIRES_IN=7d

# ─── Servidor ───────────────────────────────
PORT=4000
FRONTEND_URL=http://localhost:3000
```

> **Importante para produccion:** Generar un `JWT_SECRET` seguro:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 4. Instalar Dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Verificar la Base de Datos

```bash
cd backend
node diagnostico-bd.js
```

El script verificara:
- Conexion a MySQL
- Existencia de la base de datos
- Creacion de tablas (6 tablas)
- Datos de prueba

## Ejecucion en Desarrollo

```bash
# Terminal 1 - Backend (hot reload con --watch)
cd backend
npm run dev

# Terminal 2 - Frontend (HMR con Vite)
cd frontend
npm run dev
```

**URLs de desarrollo:**
- Frontend: http://localhost:3000
- API: http://localhost:4000/api
- Health Check: http://localhost:4000/api/health

### Script de Setup Automatico

Para Linux/Mac:
```bash
bash setup.sh
```

Para Windows (PowerShell):
```powershell
.\SETUP_BD.ps1
```

Para Windows (CMD):
```cmd
SETUP_BD.bat
```

## Despliegue Automatizado con Docker (Recomendado)

Para garantizar un despliegue aislado, rápido y evitar conflictos de arquitectura de procesador (como las restricciones de instrucciones `x86-64-v2` de MySQL 8 en hardware antiguo), el sistema está completamente dockerizado utilizando **MariaDB** como motor de base de datos drop-in replacement.

### Estructura de Producción con Docker Compose

Crear un archivo `docker-compose.yml` en la raíz del servidor o levantar un nuevo Stack en Portainer con la siguiente configuración:

```yaml
version: '3.8'

services:
  db-rh:
    image: mariadb:10.11
    container_name: rh_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: tu_password_segura
      MYSQL_DATABASE: recursos_hidricos_sde
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend-rh:
    image: node:18-slim
    container_name: rh_backend
    restart: always
    working_dir: /app
    volumes:
      - ./backend:/app
    ports:
      - "4000:4000"
    networks:
      - default
    environment:
      - DB_HOST=rh_mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=tu_password_segura
    command: sh -c "sleep 15 && npm install && DB_HOST=rh_mysql DB_PORT=3306 DB_USER=root DB_PASSWORD=tu_password_segura node src/database/init.mjs"
    depends_on:
      - db-rh

  frontend-rh:
    image: node:18-slim
    container_name: rh_frontend
    restart: always
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://<IP_O_DOMINIO_DEL_SERVIDOR>:4000
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 3000"
    depends_on:
      - backend-rh

volumes:
    mysql_data:


### Configuración del Entorno en el Frontend

Es **crítico** configurar las variables de entorno del frontend para que las peticiones del cliente apunten correctamente al servidor de backend y no a `localhost`:

1. Crear un archivo `frontend/.env` en el entorno de despliegue.
2. Definir la variable `VITE_API_URL` apuntando a la IP pública, privada de la organización o dominio asignado al servidor:

```env
VITE_API_URL=http://<IP_O_DOMINIO_DEL_SERVIDOR>:4000
```

### Comandos de Mantenimiento dentro del Contenedor (Seeds)

Si se requiere volver a popular la base de datos con los usuarios de prueba iniciales dentro del entorno Docker, ejecutar desde la consola del contenedor de backend (`rh_backend`):

```bash
DB_HOST=rh_mysql DB_PORT=3306 DB_USER=root DB_PASSWORD=tu_password_segura npm run db:seed
```

## Despliegue en Produccion

### Build del Frontend

```bash
cd frontend
npm run build
```

Esto genera la carpeta `frontend/dist/` con los archivos estaticos optimizados.

### Opciones de Despliegue del Frontend

#### Opcion 1: Servir con Vite Preview

```bash
cd frontend
npm run preview
```

#### Opcion 2: Servir con Nginx

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    root /ruta/al/proyecto/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://localhost:4000;
    }
}
```

#### Opcion 3: Servir con Express (mismo servidor)

Se puede configurar Express para servir los archivos estaticos del frontend:

```javascript
// En server.js, agregar al final de las rutas:
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});
```

### Backend en Produccion

```bash
cd backend
npm start
```

Para mantener el proceso corriendo, usar un process manager:

#### Con PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar la aplicacion
cd backend
pm2 start server.js --name "recursos-hidricos-api"

# Monitorear
pm2 logs recursos-hidricos-api
pm2 monit

# Configurar auto-start
pm2 startup
pm2 save
```

#### Con systemd (Linux)

Crear `/etc/systemd/system/recursos-hidricos.service`:

```ini
[Unit]
Description=Recursos Hidricos SDE - API
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/ruta/al/proyecto/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable recursos-hidricos
sudo systemctl start recursos-hidricos
sudo systemctl status recursos-hidricos
```

## Seguridad en Produccion

### Checklist

- [ ] Cambiar `JWT_SECRET` a un valor aleatorio seguro
- [ ] No exponer el puerto de MySQL (3306) al publico
- [ ] Configurar HTTPS con certificado SSL
- [ ] Restringir CORS a tu dominio de produccion
- [ ] Cambiar contrasenas de usuarios de prueba
- [ ] Configurar backups automaticos de MySQL
- [ ] Habilitar firewall (ufw/iptables)
- [ ] Configurar rate limiting mas estricto si es necesario
- [ ] Revisar que `.env` no este commiteado

### Variables de Entorno en Produccion

```env
DB_HOST=tu-servidor-mysql
DB_PORT=3306
DB_USER=recursos_app
DB_PASSWORD=contrasena_segura_de_produccion
DB_NAME=recursos_hidricos_sde

JWT_SECRET=clave_aleatoria_de_64_caracteres_minimo
JWT_EXPIRES_IN=24h

PORT=4000
FRONTEND_URL=https://tu-dominio.com
```

## Backups

### Backup de Base de Datos

```bash
# Backup completo
mysqldump -u root -p recursos_hidricos_sde > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
mysql -u root -p recursos_hidricos_sde < backup_20260412_103000.sql
```

### Backup de Archivos Subidos

```bash
# Copiar directorio de uploads
cp -r backend/uploads/ /ruta/de/backup/uploads_$(date +%Y%m%d)/
```

### Cron Job para Backups Automaticos

```bash
# Editar crontab
crontab -e

# Backup diario a las 2:00 AM
0 2 * * * mysqldump -u root -p'password' recursos_hidricos_sde > /backups/db_$(date +\%Y\%m\%d).sql
```

## Puertos Utilizados

| Puerto | Servicio | Configurable |
|---|---|---|
| 3000 | Frontend (Vite dev server) | `frontend/vite.config.js` o `--port` |
| 4000 | Backend (Express API) | Variable `PORT` en `.env` |
| 3306 | MySQL | Variable `DB_PORT` en `.env` |

## Troubleshooting

### El backend no conecta a MySQL

1. Verificar que MySQL este corriendo: `sudo systemctl status mysql`
2. Verificar credenciales en `.env`
3. Ejecutar diagnostico: `node backend/diagnostico-bd.js`

### Error CORS al conectar frontend con backend

1. Verificar que `FRONTEND_URL` en `.env` coincida con la URL del frontend
2. En desarrollo, asegurarse de que ambos servidores esten corriendo

### Error "Token expirado"

1. El token JWT tiene una duracion configurable (`JWT_EXPIRES_IN`)
2. El frontend redirige automaticamente a `/login` al expirar
3. Para produccion, considerar reducir el tiempo de expiracion (ej: `24h`)

### El frontend muestra pantalla en blanco

1. Verificar la consola del navegador (F12)
2. Asegurarse de que el backend este corriendo en el puerto correcto
3. Verificar que `API_BASE` en `frontend/src/services/api.js` apunte al backend correcto
