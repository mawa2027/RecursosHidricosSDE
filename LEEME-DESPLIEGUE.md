# Recursos Hídricos SDE — despliegue en el servidor

## 1. Archivos a agregar al repositorio (carpetas de este zip)

- backend/Dockerfile
- backend/.dockerignore
- backend/src/database/crear-admin.mjs
- frontend/Dockerfile
- frontend/nginx.conf
- frontend/.dockerignore

## 2. Parches en backend/server.js

**2.1 Registro público sin rol de administrador.** En `/api/auth/register`, reemplazar el bloque `if (!ROLES_VALIDOS.includes(rol)) {...}` por:

```js
if (!['inspector'].includes(rol)) {
  return res.status(400).json({ error: 'Rol inválido para el registro público' });
}
```

**2.2 Clave de sesión obligatoria.** Reemplazar la línea `const JWT_SECRET = ...` por:

```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('Falta la variable JWT_SECRET');
  process.exit(1);
}
```

**2.3 Límite de solicitudes por IP real.** Reemplazar el bloque `const limiter = rateLimit({...})` por:

```js
const ipCliente = (req) => req.headers['cf-connecting-ip'] || req.ip;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: ipCliente,
  validate: { xForwardedForHeader: false, trustProxy: false },
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
});
```

**2.4 Imágenes entre dominios (opcional).** Reemplazar `app.use(helmet());` por:

```js
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
```

## 3. Orden de trabajo

1. Coolify: crear la base MariaDB (privada, base inicial `recursos_hidricos_sde`). Anotar usuario, contraseña y host interno.
2. Coolify: crear el backend y desplegarlo.
3. Servidor: crear las tablas (sección 5).
4. Servidor: crear el administrador (sección 5).
5. Coolify: crear el frontend y desplegarlo.
6. Verificar (sección 6).

## 4. Configuración en Coolify

**Base de datos:** Database → MariaDB, sin acceso público.

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
| DB_HOST | host interno de la base (lo muestra Coolify) |
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

## 5. Comandos en el servidor

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

## 6. Verificación

```bash
curl -s https://api-recursoshidricos.itseprueba.com.ar/api/health
```

Tiene que responder `"status":"ok"` y `"database":"connected"`.

Después, desde el celular con datos móviles:

1. Abrir https://recursoshidricos.itseprueba.com.ar
2. Iniciar sesión con el administrador.
3. Crear una obra y subirle un archivo.
4. Volver a desplegar el backend y comprobar que el archivo sigue ahí.

## 7. Pendientes para el equipo

- La descarga de archivos (`archivosAPI.download`) devuelve un enlace simple y el backend exige el token en un encabezado: da error 401. Hay que descargar con `fetch` y blob, como `reportesAPI.downloadCSV`.
- La carpeta `/uploads` se sirve sin iniciar sesión.
- La tabla `obras` no admite el estado `en_estudio`, que `server.js` menciona. Si el frontend lo ofrece, falla al guardar.
- En el alta de obras, si falla la validación, la transacción queda abierta.
- No hay administrador inicial en `init.mjs`: se crea con `crear-admin.mjs`.
- El script `lint` de `frontend/package.json` tiene un error en el patrón (`"src*.{js,jsx}"`); debería ser `"src/**/*.{js,jsx}"`. No afecta al despliegue.
- `react-helmet` y `react-helmet-async` están instaladas a la vez; alcanza con una.
