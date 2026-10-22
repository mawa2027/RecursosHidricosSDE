# Arquitectura del Sistema

## Vision General

Recursos Hidricos de SDE sigue una arquitectura **cliente-servidor** clasica con separacion clara entre frontend y backend. El frontend es una SPA (Single Page Application) que se comunica con una API REST mediante peticiones HTTP autenticadas con JWT.

```
┌─────────────────────┐       HTTP/JSON        ┌─────────────────────┐
│                     │  ◄────────────────────► │                     │
│   Frontend (SPA)    │     Bearer JWT Token    │   Backend (API)     │
│   React + Vite      │                         │   Express.js        │
│   Puerto 3000       │                         │   Puerto 4000       │
│                     │                         │                     │
└─────────────────────┘                         └──────────┬──────────┘
                                                           │
                                                           │ mysql2
                                                           │
                                                ┌──────────▼──────────┐
                                                │                     │
                                                │   MySQL 8.0+        │
                                                │   Puerto 3306       │
                                                │                     │
                                                └─────────────────────┘
```

## Frontend

### Stack Tecnologico

- **React 18** con JSX (sin TypeScript)
- **Vite** como bundler y dev server
- **Tailwind CSS** para estilos utilitarios
- **Radix UI** para componentes primitivos accesibles
- **React Router v6** para enrutamiento del lado del cliente

### Estructura de Carpetas

```
frontend/src/
├── App.jsx               # Definicion de rutas y guards
├── main.jsx              # Punto de entrada, monta React en el DOM
├── index.css             # Directivas de Tailwind y estilos globales
│
├── contexts/
│   └── AuthContext.jsx   # Proveedor global de autenticacion
│                         # Expone: user, permisos, login(), register(), logout()
│
├── services/
│   └── api.js            # Cliente HTTP centralizado
│                         # Maneja: token JWT, refresh, errores 401
│                         # Exporta: authAPI, obrasAPI, archivosAPI,
│                         #          dashboardAPI, usuariosAPI, reportesAPI,
│                         #          auditoriaAPI, notificacionesAPI
│
├── lib/
│   ├── permissions.js    # Matriz de permisos por rol (RBAC)
│   │                     # Exporta: getPermisos(), puedeEditarObra(),
│   │                     #          puedeEliminarArchivo(), getRolLabel()
│   └── utils.js          # Funciones utilitarias (cn para clases CSS)
│
├── hooks/
│   ├── useObras.js       # Custom hook para CRUD de obras
│   └── usePlants.js      # Custom hook para operaciones de plantas
│
├── pages/                # Paginas (una por ruta)
│   ├── LandingPage.jsx   # Pagina publica de presentacion
│   ├── LoginPage.jsx     # Formulario de login
│   ├── RegisterPage.jsx  # Formulario de auto-registro
│   ├── Dashboard.jsx     # Panel con estadisticas y graficos
│   ├── PlantsPage.jsx    # Listado filtrable de obras
│   ├── PlantDetailPage.jsx # Detalle + archivos de una obra
│   ├── MapPage.jsx       # Mapa interactivo con marcadores
│   ├── UsersPage.jsx     # Gestion de usuarios (solo admin)
│   ├── AuditPage.jsx     # Log de auditoria (admin/presidente)
│   ├── ProfilePage.jsx   # Perfil y cambio de contrasena
│   ├── HelpPage.jsx      # Pagina de ayuda
│   └── NotFoundPage.jsx  # Pagina 404
│
└── components/
    ├── layout/
    │   └── DashboardLayout.jsx  # Sidebar + header + notificaciones
    ├── dashboard/
    │   ├── StatsCard.jsx        # Tarjeta de estadistica
    │   ├── StatusChart.jsx      # Grafico de distribucion
    │   └── RecentActivity.jsx   # Actividad reciente
    ├── plants/
    │   ├── PlantCard.jsx        # Tarjeta de obra en listado
    │   ├── PlantDialog.jsx      # Modal crear/editar obra
    │   ├── PlantMap.jsx         # Mini-mapa en detalle
    │   └── FileUpload.jsx       # Componente de carga de archivos
    └── ui/                      # Primitivos UI (Radix + Tailwind)
        ├── button.jsx
        ├── dialog.jsx
        ├── input.jsx
        ├── select.jsx
        ├── toast.jsx
        └── ...
```

### Patron de Enrutamiento

La aplicacion define tres niveles de acceso en las rutas:

| Tipo de Ruta | Componente Guard | Comportamiento |
|---|---|---|
| Publica | Ninguno | Accesible sin autenticacion (`/`, `/login`, `/register`) |
| Privada | `PrivateRoute` | Requiere usuario autenticado; redirige a `/login` |
| Admin | `AdminRoute` | Requiere permiso `gestionarUsuarios`; redirige a `/dashboard` |
| Auditoria | `AuditRoute` | Requiere permiso `verAuditoria`; redirige a `/dashboard` |

### Flujo de Autenticacion (Frontend)

1. El usuario ingresa credenciales en `LoginPage`.
2. `AuthContext.login()` llama a `authAPI.login()`.
3. El backend devuelve `{ token, user, permisos }`.
4. El token y usuario se guardan en `localStorage`.
5. `AuthContext` actualiza el estado global (`user`, `permisos`).
6. Todas las peticiones posteriores via `api.js` incluyen `Authorization: Bearer <token>`.
7. Si el token expira (error 401), se limpia el `localStorage` y se redirige a `/login`.

### Gestion de Estado

- **AuthContext**: Estado global de autenticacion (user, permisos, login, logout).
- **Estado local**: Cada pagina gestiona su propio estado con `useState` + `useEffect`.
- **No se usa Redux** ni otra libreria de estado global mas alla del contexto de autenticacion.

## Backend

### Stack Tecnologico

- **Node.js** con CommonJS (require/module.exports)
- **Express 4** como framework HTTP
- **MySQL2** con pool de conexiones (promesas)
- **bcrypt** para hash de contrasenas (12 rounds)
- **jsonwebtoken** para autenticacion JWT

### Arquitectura del Servidor

El backend esta implementado como un **monolito** en `server.js` con todas las rutas definidas directamente. Existe tambien una estructura modular en `src/` con middlewares y utilidades separadas.

```
backend/
├── server.js                 # Punto de entrada principal
│                             # Configura Express, pool MySQL, middlewares,
│                             # y todas las rutas de la API
│
├── database.sql              # Script SQL para crear BD, tablas e indices
│
├── src/
│   ├── database/
│   │   ├── connection.js     # Pool MySQL reutilizable
│   │   ├── init.js           # Script: crea BD y tablas si no existen
│   │   └── seed.js           # Script: inserta usuarios y obras de ejemplo
│   │
│   ├── middleware/
│   │   ├── auth.js           # Middleware de autenticacion JWT
│   │   ├── audit.js          # Middleware de registro de auditoria
│   │   ├── errorHandler.js   # Manejador global de errores
│   │   └── validate.js       # Validacion de datos de entrada
│   │
│   └── routes/               # Definiciones de rutas (referencia)
│       ├── auth.routes.js
│       ├── obra.routes.js
│       ├── plant.routes.js
│       ├── file.routes.js
│       ├── dashboard.routes.js
│       └── user.routes.js
│
├── diagnostico-bd.js         # Script de diagnostico de BD
└── uploads/                  # Directorio de archivos subidos
```

### Pipeline de Middlewares

Cada request pasa por la siguiente cadena:

```
Request
  │
  ▼
helmet()              → Headers de seguridad
  │
  ▼
cors()                → Origenes permitidos (localhost:3000, 3001)
  │
  ▼
express.json()        → Parse body JSON (limite 10MB)
  │
  ▼
morgan('dev')         → Logging de requests
  │
  ▼
rateLimit()           → Max 200 req/15min en /api/*
  │
  ▼
authenticateToken()   → Verifica JWT (rutas protegidas)
  │
  ▼
loadUser()            → Carga datos del usuario desde BD
  │
  ▼
Route Handler         → Logica de negocio
  │
  ▼
Error Handler         → Captura errores no manejados
```

### Flujo de Autenticacion (Backend)

1. `POST /api/auth/login` recibe correo + contrasena.
2. Busca usuario en BD por correo.
3. Verifica contrasena con `bcrypt.compare()`.
4. Genera JWT con `{ userId, rol }`, expira en 7 dias.
5. Devuelve token + datos de usuario + permisos.

### Pool de Conexiones MySQL

- Pool con hasta 20 conexiones simultaneas.
- Charset `utf8mb4` para soporte completo de Unicode.
- Reconexion automatica gestionada por mysql2.

## Patrones de Diseno

### RBAC (Role-Based Access Control)
El sistema implementa control de acceso basado en roles tanto en frontend como en backend. La matriz de permisos se mantiene sincronizada entre `frontend/src/lib/permissions.js` y el objeto `PERMISOS_ROL` en `server.js`.

### Auditoria Fire-and-Forget
Los logs de auditoria se escriben de forma asincrona sin bloquear la respuesta al usuario. Se registra usuario, accion, entidad, IP y contexto detallado (incluye diff de cambios).

### Uploads con UUID
Los archivos se renombran con UUID al subirse para evitar colisiones. Se mantiene referencia al nombre original en la BD.

### Transacciones para Operaciones Compuestas
La creacion y actualizacion de obras usa transacciones MySQL para garantizar consistencia entre la tabla `obras` y las tablas especializadas (`pozos`, `plantas`).
