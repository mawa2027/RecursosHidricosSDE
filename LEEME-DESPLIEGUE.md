# Recursos Hídricos SDE — despliegue en el servidor

## 1. Qué subir al repositorio

Subir las carpetas `backend` y `frontend` de este zip a la copia del repositorio (Add file → Upload files, arrastrando las dos carpetas). Los archivos nuevos se suman y `backend/server.js` reemplaza al que ya existe.

- backend/server.js (reemplaza al existente, ya con los cambios aplicados)
- backend/Dockerfile
- backend/.dockerignore
- backend/src/database/crear-admin.mjs
- frontend/Dockerfile
- frontend/nginx.conf
- frontend/.dockerignore

## 2. Cambios ya aplicados en backend/server.js

Están marcados en el código con `[CAMBIO SERVIDOR]`:

1. La clave de sesión (`JWT_SECRET`) es obligatoria; sin ella el servidor no arranca.
2. El registro público solo admite el rol `inspector`.
3. El límite de solicitudes cuenta la IP real del visitante (detrás de Cloudflare).
4. `helmet` permite que el frontend cargue imágenes de la API.
5. En el alta de obras se cierra la transacción antes de responder un error de validación.

## 3. Crear la base MariaDB en Coolify

Los nombres de los botones pueden variar un poco según la versión.

1. Entrar a Coolify (`http://100.120.22.112:8000`) con Tailscale activo.
2. Projects → crear un proyecto (por ejemplo `recursos-hidricos`) → entrar al entorno `production`.
3. New Resource → Databases → MariaDB.
4. Completar: Name `mariadb-recursos`; Image `mariadb:10.11` (la versión que recomienda el equipo); Username y Password (guardarlos en un gestor de contraseñas); Initial Database `recursos_hidricos_sde`.
5. Dejar desactivada la opción de acceso público ("Make it publicly available").
6. Save y Start. Esperar a que figure como Running.
7. En la página de la base, copiar el host del Internal Connection URL: es la parte entre `@` y `:3306`. Ese valor va en `DB_HOST` del backend.

## 4. Orden de trabajo

1. Crear la base MariaDB (sección 3).
2. Crear el backend y desplegarlo (sección 5).
3. En el servidor: crear las tablas y el administrador (sección 6).
4. Crear el frontend y desplegarlo (sección 5).
5. Verificar (sección 7).

## 5. Configuración en Coolify

**Backend**

| Campo | Valor |
|---|---|
| Repositorio | https://github.com/mawa2027/RecursosHidricosSDE (rama main) |
| Build Pack | Dockerfile |
| Base Directory | /backend |
| Dockerfile Location | /Dockerfile (si falla: /backend/Dockerfile) |
| Ports Exposes | 4000 |
| Dominio | protocolo http, api-recursoshidricos.itseprueba.com.ar, sin redirección de www |
| Persistent Storage | montar en /app/uploads |

| Variable | Valor |
|---|---|
| DB_HOST | host interno de la base (sección 3, punto 7) |
| DB_PORT | 3306 |
| DB_USER | usuario de la base |
| DB_PASSWORD | contraseña de la base |
| DB_NAME | recursos_hidricos_sde |
| JWT_SECRET | resultado de `openssl rand -hex 32` |
| JWT_EXPIRES_IN | 7d |
| FRONTEND_URL | https://recursoshidricos.itseprueba.com.ar |
| PORT | 4000 |

**Frontend**

| Campo | Valor |
|---|---|
| Build Pack | Dockerfile |
| Base Directory | /frontend |
| Ports Exposes | 80 |
| Dominio | protocolo http, recursoshidricos.itseprueba.com.ar, sin redirección de www |

| Variable (disponible en la construcción) | Valor |
|---|---|
| VITE_API_URL | https://api-recursoshidricos.itseprueba.com.ar |

## 6. Comandos en el servidor

```bash
docker ps --format '{{.Names}}'
```

Con el nombre del contenedor del backend (empieza con un código largo y termina con una fecha):

```bash
docker exec NOMBRE_DEL_CONTENEDOR node src/database/init.mjs

docker exec -e ADMIN_CORREO='correo@ejemplo.com' -e ADMIN_PASSWORD='clave-de-12-o-mas-caracteres' NOMBRE_DEL_CONTENEDOR node src/database/crear-admin.mjs
```

Después de crear el administrador, limpiar el historial de la terminal: `history -c`.

No ejecutar `npm run db:seed`: carga usuarios de prueba con contraseñas conocidas.

## 7. Verificación

```bash
curl -s https://api-recursoshidricos.itseprueba.com.ar/api/health
```

Tiene que responder `"status":"ok"` y `"database":"connected"`.

Después, desde el celular con datos móviles:

1. Abrir https://recursoshidricos.itseprueba.com.ar
2. Iniciar sesión con el administrador.
3. Crear una obra y subirle un archivo.
4. Volver a desplegar el backend y comprobar que el archivo sigue ahí.

## 8. Pendientes para el equipo

- La descarga de archivos (`archivosAPI.download`) devuelve un enlace simple y el backend exige el token en un encabezado: da error 401. Hay que descargar con `fetch` y blob, como `reportesAPI.downloadCSV`.
- La carpeta `/uploads` se sirve sin iniciar sesión.
- La tabla `obras` no admite el estado `en_estudio`, que `server.js` menciona. Si el frontend lo ofrece, falla al guardar.
- `init.mjs` no crea administrador: se crea con `crear-admin.mjs`.
- El script `lint` de `frontend/package.json` tiene un error en el patrón (`"src*.{js,jsx}"`); debería ser `"src/**/*.{js,jsx}"`. No afecta al despliegue.
- `react-helmet` y `react-helmet-async` están instaladas a la vez; alcanza con una.
