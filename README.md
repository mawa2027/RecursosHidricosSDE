# Recursos Hidricos de SDE

Sistema web de gestion integral de obras hidricas (pozos y plantas potabilizadoras) para Santiago del Estero, Argentina. Permite registrar, monitorear y administrar infraestructura hidrica con roles diferenciados, mapa interactivo, gestion documental y auditoria de acciones.

## Tabla de Contenidos

- [Caracteristicas](#caracteristicas)
- [Tecnologias](#tecnologias)
- [Requisitos Previos](#requisitos-previos)
- [Instalacion Rapida](#instalacion-rapida)
- [Variables de Entorno](#variables-de-entorno)
- [Ejecucion](#ejecucion)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Usuarios de Prueba](#usuarios-de-prueba)
- [Documentacion Adicional](#documentacion-adicional)
- [Licencia](#licencia)

## Caracteristicas

- **Gestion de Obras Hidricas**: CRUD completo de pozos y plantas potabilizadoras con datos tecnicos especificos (profundidad, caudal, tipo de bomba, tratamiento, capacidad, fuente).
- **Mapa Interactivo**: Visualizacion georreferenciada de todas las obras con Leaflet.
- **Sistema de Roles**: 6 roles con permisos diferenciados (Administrador, Presidente, Inspector, Dpto. Construccion, Dpto. Estudios, Dpto. Conservacion).
- **Gestion Documental**: Carga y descarga de archivos (PDF, imagenes, documentos Office, CSV) asociados a cada obra.
- **Dashboard Analitico**: Estadisticas en tiempo real, graficos de estado y distribucion de obras.
- **Auditoria**: Registro automatico de todas las acciones del sistema con trazabilidad completa.
- **Notificaciones**: Alertas en tiempo real sobre cambios en obras (creacion, actualizacion, eliminacion).
- **Exportacion CSV**: Descarga de reportes de obras en formato CSV.
- **Autenticacion JWT**: Login seguro con tokens, proteccion de rutas y manejo de sesion.

## Tecnologias

### Frontend
| Tecnologia | Version | Uso |
|---|---|---|
| React | 18.2 | Biblioteca UI |
| Vite | 4.4 | Bundler y dev server |
| Tailwind CSS | 3.4 | Estilos utilitarios |
| React Router | 6.16 | Enrutamiento SPA |
| Radix UI | - | Componentes accesibles (Dialog, Select, Toast, etc.) |
| Leaflet / React-Leaflet | 1.9 / 4.2 | Mapa interactivo |
| Recharts | 2.8 | Graficos y visualizaciones |
| Framer Motion | 10.16 | Animaciones |
| Lucide React | 0.285 | Iconografia |

### Backend
| Tecnologia | Version | Uso |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.21 | Framework HTTP |
| MySQL2 | 3.18 | Driver de base de datos |
| bcrypt | 5.1 | Hash de contrasenas |
| JSON Web Token | 9.0 | Autenticacion |
| Multer | 1.4 | Upload de archivos |
| Helmet | 7.1 | Seguridad HTTP headers |
| Morgan | 1.10 | Logging de requests |
| express-rate-limit | 7.4 | Proteccion contra abuso |

### Base de Datos
| Tecnologia | Version | Uso |
|---|---|---|
| MySQL / MariaDB | 8.0+ / 10.4+ | Base de datos relacional (Compatible con arquitecturas heredadas) |

## Requisitos Previos

- **Node.js** >= 18.x ([descargar](https://nodejs.org/))
- **npm** >= 9.x (incluido con Node.js)
- **MySQL** >= 8.0 ([descargar](https://dev.mysql.com/downloads/mysql/)) 
- Alternativa a MySQL **MariaDB** >= 10.4 ([descargar](https://mariadb.org/download/))

## Instalacion Rapida

```bash
# 1. Clonar el repositorio
git clone https://github.com/marcoib-dev/RecursosHidricosSDE.git
cd RecursosHidricosSDE

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Configurar variables de entorno del backend
cp .env.example .env
# Editar .env con tus credenciales de MySQL

# 4. Inicializar la base de datos
npm run db:init

# 5. Cargar datos de prueba
npm run db:seed

# 6. Instalar dependencias del frontend
cd ../frontend
npm install
```

## Variables de Entorno

Crear un archivo `backend/.env` con las siguientes variables:

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=recursos_hidricos_sde

# JWT
JWT_SECRET=tu_clave_secreta_segura
JWT_EXPIRES_IN=7d

# Servidor
PORT=4000
FRONTEND_URL=http://localhost:3000
```

## Ejecucion

### Desarrollo

Abrir dos terminales:

```bash
# Terminal 1 - Backend (puerto 4000)
cd backend
npm run dev

# Terminal 2 - Frontend (puerto 3000)
cd frontend
npm run dev
```

La aplicacion estara disponible en:
- **Frontend**: http://localhost:3000
- **API Backend**: http://localhost:4000/api
- **Health Check**: http://localhost:4000/api/health

### Produccion

```bash
# Backend
cd backend
npm start

# Frontend (generar build)
cd frontend
npm run build
npm run preview
```

## Estructura del Proyecto

```
RecursosHidricosSDE/
├── backend/
│   ├── server.js                 # Servidor Express (punto de entrada)
│   ├── database.sql              # Script SQL completo de la BD
│   ├── package.json
│   ├── src/
│   │   ├── database/
│   │   │   ├── connection.js     # Pool de conexion MySQL
│   │   │   ├── init.js           # Inicializacion de tablas
│   │   │   └── seed.js           # Datos de prueba
│   │   ├── middleware/
│   │   │   ├── auth.js           # Autenticacion JWT
│   │   │   ├── audit.js          # Middleware de auditoria
│   │   │   ├── errorHandler.js   # Manejo global de errores
│   │   │   └── validate.js       # Validacion de datos
│   │   └── routes/
│   │       ├── auth.routes.js
│   │       ├── obra.routes.js
│   │       ├── plant.routes.js
│   │       ├── file.routes.js
│   │       ├── dashboard.routes.js
│   │       └── user.routes.js
│   └── uploads/                  # Archivos subidos (gitignored)
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx               # Rutas principales
│       ├── main.jsx              # Punto de entrada React
│       ├── index.css             # Estilos globales Tailwind
│       ├── contexts/
│       │   └── AuthContext.jsx   # Contexto de autenticacion
│       ├── services/
│       │   └── api.js            # Cliente HTTP centralizado
│       ├── lib/
│       │   ├── permissions.js    # Matriz de permisos por rol
│       │   └── utils.js          # Utilidades generales
│       ├── hooks/
│       │   ├── useObras.js       # Hook para obras
│       │   └── usePlants.js      # Hook para plantas
│       ├── pages/
│       │   ├── LandingPage.jsx   # Pagina de inicio publica
│       │   ├── LoginPage.jsx     # Inicio de sesion
│       │   ├── RegisterPage.jsx  # Registro de usuarios
│       │   ├── Dashboard.jsx     # Panel principal
│       │   ├── PlantsPage.jsx    # Listado de obras
│       │   ├── PlantDetailPage.jsx # Detalle de obra
│       │   ├── MapPage.jsx       # Mapa interactivo
│       │   ├── UsersPage.jsx     # Gestion de usuarios
│       │   ├── AuditPage.jsx     # Registro de auditoria
│       │   ├── ProfilePage.jsx   # Perfil del usuario
│       │   ├── HelpPage.jsx      # Pagina de ayuda
│       │   └── NotFoundPage.jsx  # Pagina 404
│       └── components/
│           ├── layout/
│           │   └── DashboardLayout.jsx  # Layout con sidebar
│           ├── dashboard/
│           │   ├── StatsCard.jsx
│           │   ├── StatusChart.jsx
│           │   └── RecentActivity.jsx
│           ├── plants/
│           │   ├── PlantCard.jsx
│           │   ├── PlantDialog.jsx
│           │   ├── PlantMap.jsx
│           │   └── FileUpload.jsx
│           └── ui/               # Componentes base (Radix + Tailwind)
│
├── docs/                         # Documentacion detallada
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── ROLES_Y_PERMISOS.md
│   └── DEPLOYMENT.md
│
├── CONTRIBUTING.md
├── CHANGELOG.md
├── setup.sh                      # Script de setup automatico (Linux/Mac)
├── SETUP_BD.ps1                  # Script de setup (Windows PowerShell)
├── SETUP_BD.bat                  # Script de setup (Windows CMD)
└── .gitignore
```

> Para una descripcion detallada de la arquitectura, ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Usuarios de Prueba

Despues de ejecutar `npm run db:seed`, estos usuarios estaran disponibles:

| Rol | Correo | Contrasena |
|---|---|---|
| Administrador | admin@recursoshidricos.gob.ar | admin123 |
| Presidente | presidente@recursoshidricos.gob.ar | presidente123 |
| Inspector | inspector@recursoshidricos.gob.ar | inspector123 |
| Dpto. Construccion | construccion@recursoshidricos.gob.ar | depto123 |
| Dpto. Estudios | estudios@recursoshidricos.gob.ar | depto123 |
| Dpto. Conservacion | conservacion@recursoshidricos.gob.ar | depto123 |

## Documentacion Adicional

| Documento | Descripcion |
|---|---|
| [Arquitectura](docs/ARCHITECTURE.md) | Diagrama de arquitectura, flujo de datos y decisiones de diseno |
| [API REST](docs/API.md) | Referencia completa de todos los endpoints |
| [Base de Datos](docs/DATABASE.md) | Modelo entidad-relacion y esquema de tablas |
| [Roles y Permisos](docs/ROLES_Y_PERMISOS.md) | Matriz de permisos por rol |
| [Despliegue](docs/DEPLOYMENT.md) | Guia de configuracion y despliegue en produccion |
| [Contribucion](CONTRIBUTING.md) | Guia para contribuir al proyecto |
| [Changelog](CHANGELOG.md) | Historial de cambios |

## Licencia

Proyecto academico desarrollado para el ITSE (Instituto Tecnologico de Santiago del Estero).
Derechos Reservados 2026
