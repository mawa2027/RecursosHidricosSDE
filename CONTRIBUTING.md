# Guia de Contribucion

Gracias por tu interes en contribuir a Recursos Hidricos de SDE. Esta guia te ayudara a configurar el entorno y seguir las convenciones del proyecto.

## Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x
- MySQL >= 8.0
- Git

## Configuracion del Entorno

1. **Fork y clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/RecursosHidricosSDE.git
   cd RecursosHidricosSDE
   ```

2. **Instalar dependencias:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configurar la base de datos:**
   ```bash
   cd backend
   cp .env.example .env
   # Editar .env con tus credenciales de MySQL
   npm run db:init
   npm run db:seed
   ```

4. **Verificar la instalacion:**
   ```bash
   cd backend
   node diagnostico-bd.js
   ```

5. **Iniciar el proyecto:**
   ```bash
   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   cd frontend && npm run dev
   ```

## Estructura del Proyecto

```
RecursosHidricosSDE/
├── backend/          # API REST con Express + MySQL
├── frontend/         # SPA con React + Vite + Tailwind
└── docs/             # Documentacion tecnica
```

Para mas detalle, ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Convenciones de Codigo

### General

- **Idioma del codigo:** Variables, funciones y comentarios en espanol.
- **Formato:** Indentacion con 2 espacios.
- **Comillas:** Simples en JavaScript.
- **Punto y coma:** Si.

### Frontend

- **Componentes:** Archivos `.jsx` con PascalCase (ej: `PlantCard.jsx`).
- **Hooks:** Prefijo `use` (ej: `useObras.js`).
- **Servicios:** Archivos en `src/services/`.
- **Estilos:** Tailwind CSS exclusivamente. No usar CSS modules ni styled-components.
- **Componentes UI:** Usar los primitivos de Radix UI en `src/components/ui/`.
- **Imports:** Usar alias `@/` para imports relativos a `src/`.

### Backend

- **Modulos:** CommonJS (`require` / `module.exports`) en `server.js`.
- **Base de datos:** Queries con placeholders `?` (prepared statements). No concatenar SQL.
- **Autenticacion:** Siempre usar los middlewares `authenticateToken` y `loadUser`.
- **Errores:** Devolver `{ error: "mensaje" }` con el codigo HTTP apropiado.
- **Auditoria:** Registrar acciones con `auditLog()` para trazabilidad.

## Flujo de Trabajo con Git

### Ramas

- `main` - Rama principal, siempre estable.
- `feature/nombre` - Nueva funcionalidad.
- `fix/nombre` - Correccion de bugs.
- `docs/nombre` - Cambios en documentacion.

### Commits

Usar mensajes descriptivos en espanol:

```
feat: agregar filtro por localidad en listado de obras
fix: corregir validacion de rol en registro de usuario
docs: actualizar documentacion de API
refactor: extraer middleware de auditoria a archivo separado
```

### Pull Requests

1. Crear una rama desde `main`.
2. Hacer los cambios y commits.
3. Verificar que el frontend compile: `cd frontend && npm run build`.
4. Crear el PR con descripcion clara de los cambios.

## Lint

El frontend tiene ESLint configurado:

```bash
cd frontend
npm run lint
```

## Agregar Nuevas Funcionalidades

### Nuevo Endpoint API

1. Definir la ruta en `server.js` (o en el archivo de rutas correspondiente en `src/routes/`).
2. Aplicar los middlewares de autenticacion necesarios.
3. Agregar validacion de permisos si corresponde.
4. Registrar la accion en auditoria con `auditLog()`.
5. Documentar en `docs/API.md`.

### Nueva Pagina Frontend

1. Crear el componente en `frontend/src/pages/`.
2. Agregar la ruta en `App.jsx` con el guard apropiado.
3. Agregar el item al menu en `DashboardLayout.jsx` si corresponde.
4. Crear funciones en `api.js` para comunicarse con el backend.

### Nuevo Rol o Permiso

1. Agregar el permiso en `frontend/src/lib/permissions.js`.
2. Agregar el permiso en el objeto `PERMISOS_ROL` de `server.js`.
3. Actualizar `docs/ROLES_Y_PERMISOS.md`.

### Nueva Tabla en la Base de Datos

1. Agregar la sentencia CREATE TABLE en `backend/database.sql`.
2. Agregar la creacion en `backend/src/database/init.js`.
3. Agregar datos de ejemplo en `backend/src/database/seed.js`.
4. Documentar en `docs/DATABASE.md`.

## Reporte de Bugs

Al reportar un bug, incluir:

1. Descripcion del problema.
2. Pasos para reproducir.
3. Comportamiento esperado vs actual.
4. Rol del usuario con el que se reproduce.
5. Capturas de pantalla si aplica.
6. Errores en la consola del navegador (F12) o del servidor.

## Contacto

Para preguntas o sugerencias, abrir un Issue en el repositorio.
