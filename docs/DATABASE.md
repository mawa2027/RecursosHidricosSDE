# Modelo de Base de Datos

Base de datos: **MySQL 8.0+**  
Nombre: `recursos_hidricos_sde`  
Charset: `utf8mb4` / Collation: `utf8mb4_unicode_ci`  
Engine: InnoDB (soporte transaccional y foreign keys)

## Diagrama Entidad-Relacion

```
┌─────────────────┐
│    usuarios      │
│─────────────────│
│ PK id           │──────────────────────────────────────┐
│    nombre       │                                      │
│    apellido     │                                      │
│    correo (UQ)  │         ┌────────────────────┐       │
│    contrasena   │         │    auditoria       │       │
│    rol (ENUM)   │         │────────────────────│       │
│    activo       │         │ PK id              │       │
│    created_at   │    ┌───►│ FK usuario_id ─────┼───────┘
│    updated_at   │    │    │    titulo          │
└────────┬────────┘    │    │    contexto        │
         │             │    │    entidad         │
         │             │    │    entidad_id      │
         │             │    │    ip_address      │
         │             │    │    fecha           │
         │             │    └────────────────────┘
         │
         │ created_by
         │
┌────────▼────────┐         ┌────────────────────┐
│     obras        │         │   archivos_obra    │
│─────────────────│         │────────────────────│
│ PK id           │────────►│ PK id (UUID)       │
│    tipo (ENUM)  │  obra_id│ FK obra_id         │
│    nombre       │         │    nombre_original │
│    ubicacion    │         │    nombre_guardado │
│    empresa      │         │    mime_type       │
│    responsable  │         │    tamano          │
│    estado (ENUM)│         │ FK subido_por      │
│    anio         │         │    created_at      │
│    latitud      │         └────────────────────┘
│    longitud     │
│    descripcion  │
│    porcentaje   │
│    localidad    │
│ FK created_by   │
│    created_at   │
│    updated_at   │
└────────┬────────┘
         │
         │ Herencia (relacion "Es")
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────────┐
│ pozos  │  │  plantas   │
│────────│  │────────────│
│ PK/FK id│ │ PK/FK id   │
│ profund.│ │ tratamiento│
│ caudal  │ │ capacidad  │
│ bomba   │ │ fuente     │
│ contam. │ └────────────┘
└────────┘
```

## Tablas

### `usuarios`

Almacena los usuarios del sistema con sus credenciales y roles.

| Columna | Tipo | Restricciones | Descripcion |
|---|---|---|---|
| `id` | INT UNSIGNED | PK, AUTO_INCREMENT | Identificador unico |
| `nombre` | VARCHAR(255) | NOT NULL | Nombre del usuario |
| `apellido` | VARCHAR(255) | NOT NULL | Apellido del usuario |
| `correo` | VARCHAR(255) | NOT NULL, UNIQUE | Correo electronico (login) |
| `contrasena` | VARCHAR(255) | NOT NULL | Hash bcrypt (12 rounds) |
| `rol` | ENUM | NOT NULL, DEFAULT 'inspector' | Rol del usuario |
| `activo` | TINYINT(1) | DEFAULT 1 | 1 = activo, 0 = desactivado |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Fecha de creacion |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Ultima modificacion |

**Roles validos:**
- `administrador`
- `presidente`
- `inspector`
- `dpto_construccion`
- `dpto_estudios`
- `dpto_conservacion`

---

### `obras`

Entidad principal que representa una obra hidrica (pozo o planta).

| Columna | Tipo | Restricciones | Descripcion |
|---|---|---|---|
| `id` | INT UNSIGNED | PK, AUTO_INCREMENT | Identificador unico |
| `tipo` | ENUM('pozo','planta') | NOT NULL | Tipo de obra |
| `nombre` | VARCHAR(255) | NOT NULL | Nombre de la obra |
| `ubicacion` | VARCHAR(500) | NOT NULL | Direccion o descripcion de ubicacion |
| `empresa` | VARCHAR(255) | - | Empresa responsable |
| `responsable` | VARCHAR(255) | NOT NULL | Persona responsable |
| `estado` | ENUM | NOT NULL, DEFAULT 'en_funcionamiento' | Estado operativo |
| `anio` | YEAR | - | Ano de construccion o puesta en marcha |
| `latitud` | DECIMAL(10,6) | - | Coordenada latitud |
| `longitud` | DECIMAL(10,6) | - | Coordenada longitud |
| `descripcion` | TEXT | - | Descripcion detallada |
| `porcentaje_avance` | INT | DEFAULT 100 | Porcentaje de avance (0-100) |
| `localidad` | VARCHAR(255) | - | Localidad donde se ubica |
| `created_by` | INT UNSIGNED | FK → usuarios(id) ON DELETE SET NULL | Usuario que creo la obra |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Fecha de creacion |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Ultima modificacion |

**Estados validos:**
- `en_funcionamiento` - Operativa
- `en_reparacion` - En mantenimiento/reparacion
- `fuera_de_servicio` - Inactiva
- `en_construccion` - En proceso de construccion

---

### `pozos`

Datos especificos de obras de tipo pozo. Relacion 1:1 con `obras`.

| Columna | Tipo | Restricciones | Descripcion |
|---|---|---|---|
| `id` | INT UNSIGNED | PK, FK → obras(id) ON DELETE CASCADE | Mismo ID que la obra |
| `profundidad` | DECIMAL(10,2) | - | Profundidad en metros |
| `caudal` | DECIMAL(10,2) | - | Caudal en m3/h |
| `tipo_bomba` | VARCHAR(255) | - | Tipo de bomba instalada |
| `contaminantes` | TEXT | - | Detalle de contaminantes detectados |

---

### `plantas`

Datos especificos de obras de tipo planta. Relacion 1:1 con `obras`.

| Columna | Tipo | Restricciones | Descripcion |
|---|---|---|---|
| `id` | INT UNSIGNED | PK, FK → obras(id) ON DELETE CASCADE | Mismo ID que la obra |
| `tratamiento` | VARCHAR(255) | - | Tipo de tratamiento aplicado |
| `capacidad` | VARCHAR(255) | - | Capacidad de procesamiento |
| `fuente` | VARCHAR(255) | - | Fuente de agua (rio, acuifero, etc.) |

---

### `archivos_obra`

Archivos adjuntos asociados a obras (certificados, informes, fotos).

| Columna | Tipo | Restricciones | Descripcion |
|---|---|---|---|
| `id` | CHAR(36) | PK, DEFAULT UUID() | UUID generado automaticamente |
| `obra_id` | INT UNSIGNED | NOT NULL, FK → obras(id) ON DELETE CASCADE | Obra a la que pertenece |
| `nombre_original` | VARCHAR(500) | NOT NULL | Nombre original del archivo |
| `nombre_guardado` | VARCHAR(500) | NOT NULL | Nombre UUID en el servidor |
| `mime_type` | VARCHAR(100) | - | Tipo MIME del archivo |
| `tamano` | BIGINT | - | Tamano en bytes |
| `subido_por` | INT UNSIGNED | FK → usuarios(id) ON DELETE SET NULL | Usuario que subio el archivo |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Fecha de subida |

---

### `auditoria`

Registro de todas las acciones realizadas en el sistema.

| Columna | Tipo | Restricciones | Descripcion |
|---|---|---|---|
| `id` | INT UNSIGNED | PK, AUTO_INCREMENT | Identificador unico |
| `usuario_id` | INT UNSIGNED | FK → usuarios(id) ON DELETE SET NULL | Usuario que realizo la accion |
| `titulo` | VARCHAR(255) | NOT NULL | Tipo de accion (CREAR_OBRA, etc.) |
| `contexto` | TEXT | - | JSON con detalles de la accion |
| `entidad` | VARCHAR(100) | - | Tipo de entidad afectada |
| `entidad_id` | VARCHAR(64) | - | ID de la entidad afectada |
| `ip_address` | VARCHAR(45) | - | Direccion IP del cliente |
| `fecha` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Fecha y hora de la accion |

---

## Indices

| Tabla | Indice | Columnas | Proposito |
|---|---|---|---|
| `obras` | `idx_obras_tipo` | tipo | Filtrado rapido por tipo |
| `obras` | `idx_obras_estado` | estado | Filtrado rapido por estado |
| `obras` | `idx_obras_localidad` | localidad | Filtrado rapido por localidad |
| `obras` | `idx_obras_created_by` | created_by | JOINs con usuarios |
| `archivos_obra` | `idx_archivos_obra_id` | obra_id | Listado de archivos por obra |
| `auditoria` | `idx_auditoria_usuario` | usuario_id | Filtrado por usuario |
| `auditoria` | `idx_auditoria_entidad` | entidad, entidad_id | Filtrado por entidad |
| `usuarios` | `idx_usuarios_correo` | correo | Busqueda por correo (login) |

## Relaciones y Cascadas

| Relacion | ON DELETE | Descripcion |
|---|---|---|
| `obras.created_by` → `usuarios.id` | SET NULL | Si se elimina un usuario, sus obras quedan sin creador |
| `pozos.id` → `obras.id` | CASCADE | Si se elimina una obra tipo pozo, se eliminan datos de pozo |
| `plantas.id` → `obras.id` | CASCADE | Si se elimina una obra tipo planta, se eliminan datos de planta |
| `archivos_obra.obra_id` → `obras.id` | CASCADE | Si se elimina una obra, se eliminan sus archivos |
| `archivos_obra.subido_por` → `usuarios.id` | SET NULL | Si se elimina un usuario, los archivos quedan sin subidor |
| `auditoria.usuario_id` → `usuarios.id` | SET NULL | Si se elimina un usuario, sus registros quedan sin usuario |

## Scripts de Base de Datos

| Comando | Descripcion |
|---|---|
| `npm run db:init` | Crea la base de datos y todas las tablas |
| `npm run db:seed` | Inserta usuarios y obras de ejemplo |
| `node diagnostico-bd.js` | Ejecuta diagnostico de la conexion y tablas |

El archivo `database.sql` contiene el script completo de creacion de BD, tablas, indices y datos de ejemplo. Se puede ejecutar directamente en un cliente MySQL:

```bash
mysql -u root -p < backend/database.sql
```
