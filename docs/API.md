# Referencia de la API REST

Base URL: `http://localhost:4000/api`

Todas las rutas protegidas requieren el header:
```
Authorization: Bearer <jwt_token>
```

## Indice

- [Health Check](#health-check)
- [Autenticacion](#autenticacion)
- [Obras](#obras)
- [Archivos](#archivos)
- [Dashboard](#dashboard)
- [Usuarios](#usuarios)
- [Auditoria](#auditoria)
- [Notificaciones](#notificaciones)
- [Reportes](#reportes)
- [Errores Comunes](#errores-comunes)

---

## Health Check

### `GET /api/health`

Verifica el estado del servidor y la conexion a la base de datos.

**Autenticacion:** No requerida

**Respuesta exitosa (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-12T10:30:00.000Z",
  "database": "connected"
}
```

**Respuesta error (503):**
```json
{
  "status": "error",
  "database": "disconnected"
}
```

---

## Autenticacion

### `POST /api/auth/login`

Inicia sesion y devuelve un token JWT.

**Autenticacion:** No requerida

**Body:**
```json
{
  "correo": "admin@recursoshidricos.gob.ar",
  "contrasena": "admin123"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Inicio de sesion exitoso",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "nombre": "Carlos",
    "apellido": "Administrador",
    "correo": "admin@recursoshidricos.gob.ar",
    "rol": "administrador"
  },
  "permisos": {
    "crearObra": true,
    "editarObra": true,
    "eliminarObra": true,
    "subirArchivos": true,
    "eliminarArchivos": true,
    "gestionarUsuarios": true,
    "verAuditoria": true
  }
}
```

**Errores:**
| Codigo | Mensaje |
|---|---|
| 400 | Correo y contrasena son requeridos |
| 401 | Credenciales invalidas |
| 403 | Cuenta desactivada |

---

### `POST /api/auth/register`

Registra un nuevo usuario.

**Autenticacion:** No requerida

**Body:**
```json
{
  "nombre": "Juan",
  "apellido": "Perez",
  "correo": "juan@ejemplo.com",
  "contrasena": "miPassword123",
  "rol": "inspector"
}
```

**Roles validos:** `administrador`, `presidente`, `inspector`, `dpto_construccion`, `dpto_estudios`, `dpto_conservacion`

**Respuesta exitosa (201):**
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 7,
    "nombre": "Juan",
    "apellido": "Perez",
    "correo": "juan@ejemplo.com",
    "rol": "inspector",
    "created_at": "2026-04-12T10:30:00.000Z"
  }
}
```

**Errores:**
| Codigo | Mensaje |
|---|---|
| 400 | Todos los campos son requeridos / Rol invalido |
| 409 | El correo ya esta registrado |

---

### `GET /api/auth/me`

Obtiene el perfil del usuario autenticado.

**Autenticacion:** Requerida

**Respuesta (200):**
```json
{
  "user": {
    "id": 1,
    "nombre": "Carlos",
    "apellido": "Administrador",
    "correo": "admin@recursoshidricos.gob.ar",
    "rol": "administrador",
    "activo": 1
  },
  "permisos": { ... }
}
```

---

### `POST /api/auth/reset-password`

Restablece la contrasena de un usuario (solo administradores).

**Autenticacion:** Requerida (rol: administrador)

**Body:**
```json
{
  "usuario_id": 3,
  "nueva_contrasena": "newPassword123"
}
```

**Respuesta (200):**
```json
{
  "message": "Contrasena restablecida correctamente"
}
```

---

### `POST /api/auth/change-password`

Cambia la contrasena del usuario autenticado.

**Autenticacion:** Requerida

**Body:**
```json
{
  "contrasena_actual": "admin123",
  "nueva_contrasena": "newPassword456"
}
```

**Respuesta (200):**
```json
{
  "message": "Contrasena actualizada correctamente"
}
```

**Errores:**
| Codigo | Mensaje |
|---|---|
| 400 | La nueva contrasena debe tener al menos 6 caracteres |
| 401 | La contrasena actual es incorrecta |

---

### `PUT /api/auth/profile`

Actualiza el nombre y apellido del usuario autenticado.

**Autenticacion:** Requerida

**Body:**
```json
{
  "nombre": "Carlos Eduardo",
  "apellido": "Gomez"
}
```

**Respuesta (200):**
```json
{
  "user": { ... },
  "message": "Perfil actualizado correctamente"
}
```

---

## Obras

### `GET /api/obras`

Lista todas las obras con filtros opcionales.

**Autenticacion:** Requerida

**Query params:**
| Parametro | Tipo | Descripcion |
|---|---|---|
| `tipo` | string | Filtrar por tipo: `pozo` o `planta` |
| `estado` | string | Filtrar por estado: `en_funcionamiento`, `en_reparacion`, `fuera_de_servicio`, `en_construccion` |
| `localidad` | string | Filtrar por localidad |
| `search` | string | Busqueda por nombre, ubicacion o responsable |
| `page` | number | Pagina (default: 1) |
| `limit` | number | Resultados por pagina (default: 50) |

**Respuesta (200):**
```json
{
  "obras": [
    {
      "id": 1,
      "tipo": "planta",
      "nombre": "Planta Potabilizadora Capital",
      "ubicacion": "Santiago del Estero Capital",
      "empresa": "APRH",
      "responsable": "Ing. Maria Garcia",
      "estado": "en_funcionamiento",
      "anio": 2018,
      "latitud": -27.783400,
      "longitud": -64.264200,
      "descripcion": "Planta principal...",
      "porcentaje_avance": 100,
      "localidad": "Capital",
      "created_by": 1,
      "created_at": "2026-04-12T10:00:00.000Z",
      "creado_por_nombre": "Carlos",
      "creado_por_apellido": "Administrador",
      "tratamiento": "Potabilizacion convencional",
      "capacidad": "800 m3/h",
      "fuente": "Rio Dulce"
    }
  ],
  "total": 6,
  "page": 1,
  "totalPages": 1
}
```

---

### `GET /api/obras/:id`

Obtiene el detalle de una obra incluyendo datos especificos (pozo o planta).

**Autenticacion:** Requerida

**Respuesta (200):**
```json
{
  "obra": {
    "id": 1,
    "tipo": "planta",
    "nombre": "Planta Potabilizadora Capital",
    "tratamiento": "Potabilizacion convencional",
    "capacidad": "800 m3/h",
    "fuente": "Rio Dulce",
    ...
  }
}
```

---

### `POST /api/obras`

Crea una nueva obra (pozo o planta).

**Autenticacion:** Requerida  
**Permiso:** `crearObra`

**Body (ejemplo planta):**
```json
{
  "tipo": "planta",
  "nombre": "Nueva Planta",
  "ubicacion": "Capital, Santiago del Estero",
  "empresa": "APRH",
  "responsable": "Ing. Perez",
  "estado": "en_construccion",
  "anio": 2026,
  "latitud": -27.78,
  "longitud": -64.26,
  "descripcion": "Nueva planta de tratamiento",
  "porcentaje_avance": 30,
  "localidad": "Capital",
  "tratamiento": "Osmosis inversa",
  "capacidad": "200 m3/h",
  "fuente": "Rio Dulce"
}
```

**Body (ejemplo pozo):**
```json
{
  "tipo": "pozo",
  "nombre": "Pozo N 30",
  "ubicacion": "Anatuya",
  "responsable": "Ing. Lopez",
  "estado": "en_funcionamiento",
  "profundidad": 150.5,
  "caudal": 60.0,
  "tipo_bomba": "Bomba sumergible centrifuga",
  "contaminantes": "Sin contaminantes detectados"
}
```

**Respuesta (201):**
```json
{
  "obra": { ... }
}
```

---

### `PUT /api/obras/:id`

Actualiza una obra existente.

**Autenticacion:** Requerida  
**Permiso:** `editarObra` (roles con `editarSoloSuyas` solo pueden editar obras propias)

**Body:** Mismos campos que POST.

**Respuesta (200):**
```json
{
  "obra": { ... }
}
```

---

### `DELETE /api/obras/:id`

Elimina una obra y todos sus archivos asociados.

**Autenticacion:** Requerida  
**Permiso:** `eliminarObra`

**Respuesta (200):**
```json
{
  "message": "Obra eliminada correctamente",
  "obra": { "id": 1, "nombre": "...", "tipo": "planta" }
}
```

---

## Archivos

### `POST /api/archivos/:obraId`

Sube un archivo asociado a una obra.

**Autenticacion:** Requerida  
**Permiso:** `subirArchivos`  
**Content-Type:** `multipart/form-data`

**Form data:**
- `file`: Archivo a subir (max 10 MB)

**Tipos permitidos:** PDF, JPEG, PNG, WebP, DOC, DOCX, XLS, XLSX, CSV

**Respuesta (201):**
```json
{
  "archivo": {
    "id": "uuid-...",
    "nombre_original": "informe.pdf",
    "nombre_guardado": "uuid.pdf",
    "mime_type": "application/pdf",
    "tamano": 245760,
    "created_at": "2026-04-12T10:30:00.000Z"
  }
}
```

---

### `GET /api/archivos/:obraId`

Lista todos los archivos de una obra.

**Autenticacion:** Requerida

**Respuesta (200):**
```json
{
  "archivos": [
    {
      "id": "uuid-...",
      "nombre_original": "informe.pdf",
      "mime_type": "application/pdf",
      "tamano": 245760,
      "created_at": "...",
      "subido_por_nombre": "Carlos",
      "subido_por_apellido": "Administrador"
    }
  ]
}
```

---

### `GET /api/archivos/download/:fileId`

Descarga un archivo.

**Autenticacion:** Requerida

**Respuesta:** El archivo binario con headers `Content-Disposition` y `Content-Type`.

---

### `DELETE /api/archivos/:fileId`

Elimina un archivo del sistema.

**Autenticacion:** Requerida  
**Permiso:** `eliminarArchivos` (roles con `eliminarSoloSuyos` solo pueden eliminar archivos propios)

**Respuesta (200):**
```json
{
  "message": "Archivo eliminado correctamente"
}
```

---

## Dashboard

### `GET /api/dashboard/stats`

Obtiene estadisticas generales del sistema.

**Autenticacion:** Requerida

**Respuesta (200):**
```json
{
  "stats": {
    "totalObras": 6,
    "enFuncionamiento": 3,
    "enReparacion": 1,
    "fueraDeServicio": 1,
    "enConstruccion": 1,
    "totalPozos": 3,
    "totalPlantas": 3,
    "totalArchivos": 5,
    "totalArchivosSize": 1234567
  }
}
```

---

### `GET /api/dashboard/activity`

Obtiene la actividad reciente del sistema.

**Autenticacion:** Requerida

**Query params:**
| Parametro | Tipo | Descripcion |
|---|---|---|
| `limit` | number | Cantidad de registros (default: 10) |

**Respuesta (200):**
```json
{
  "activity": [
    {
      "id": 1,
      "titulo": "CREAR_OBRA",
      "contexto": "{...}",
      "entidad": "obra",
      "entidad_id": "5",
      "fecha": "2026-04-12T10:30:00.000Z",
      "usuario_nombre": "Carlos",
      "usuario_apellido": "Administrador"
    }
  ]
}
```

---

### `GET /api/dashboard/en-construccion`

Lista obras en estado "en_construccion" ordenadas por avance.

**Autenticacion:** Requerida

**Respuesta (200):**
```json
{
  "obras": [
    {
      "id": 5,
      "nombre": "Pozo N 25",
      "ubicacion": "...",
      "porcentaje_avance": 45,
      ...
    }
  ]
}
```

---

### `GET /api/dashboard/chart-data`

Obtiene datos para los graficos del dashboard.

**Autenticacion:** Requerida

**Respuesta (200):**
```json
{
  "distribucionEstados": [
    { "estado": "en_funcionamiento", "count": 3 },
    { "estado": "en_reparacion", "count": 1 }
  ],
  "distribucionTipos": [
    { "tipo": "planta", "count": 3 },
    { "tipo": "pozo", "count": 3 }
  ],
  "creacionMensual": [
    { "mes": "2026-03", "count": 2 },
    { "mes": "2026-04", "count": 4 }
  ]
}
```

---

## Usuarios

> Todas las rutas de usuarios requieren el permiso `gestionarUsuarios` (solo rol `administrador`).

### `GET /api/usuarios`

Lista usuarios con filtros.

**Autenticacion:** Requerida (administrador)

**Query params:**
| Parametro | Tipo | Descripcion |
|---|---|---|
| `search` | string | Buscar por nombre, apellido o correo |
| `rol` | string | Filtrar por rol |
| `page` | number | Pagina (default: 1) |
| `limit` | number | Resultados por pagina (default: 50) |

**Respuesta (200):**
```json
{
  "usuarios": [
    {
      "id": 1,
      "nombre": "Carlos",
      "apellido": "Administrador",
      "correo": "admin@recursoshidricos.gob.ar",
      "rol": "administrador",
      "activo": 1,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 6,
  "page": 1,
  "totalPages": 1
}
```

---

### `GET /api/usuarios/:id`

Obtiene detalle de un usuario.

**Autenticacion:** Requerida (administrador)

**Respuesta (200):**
```json
{
  "usuario": {
    "id": 1,
    "nombre": "Carlos",
    "apellido": "Administrador",
    "correo": "admin@recursoshidricos.gob.ar",
    "rol": "administrador",
    "activo": 1,
    "obras_creadas": 6,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### `PATCH /api/usuarios/:id/role`

Cambia el rol de un usuario.

**Autenticacion:** Requerida (administrador)

**Body:**
```json
{
  "rol": "presidente"
}
```

**Respuesta (200):**
```json
{
  "usuario": { ... },
  "message": "Rol actualizado a \"presidente\""
}
```

**Errores:**
| Codigo | Mensaje |
|---|---|
| 400 | No puedes cambiar tu propio rol / Rol invalido |
| 404 | Usuario no encontrado |

---

### `PATCH /api/usuarios/:id/toggle-active`

Activa o desactiva un usuario.

**Autenticacion:** Requerida (administrador)

**Respuesta (200):**
```json
{
  "usuario": { ... },
  "message": "Usuario activado correctamente"
}
```

**Errores:**
| Codigo | Mensaje |
|---|---|
| 400 | No puedes desactivarte a ti mismo |

---

## Auditoria

### `GET /api/auditoria`

Lista registros de auditoria con paginacion y filtros.

**Autenticacion:** Requerida  
**Permiso:** `verAuditoria`

**Query params:**
| Parametro | Tipo | Descripcion |
|---|---|---|
| `search` | string | Buscar en titulo, nombre o apellido |
| `entidad` | string | Filtrar por tipo de entidad |
| `page` | number | Pagina (default: 1) |
| `limit` | number | Resultados por pagina (default: 25) |

**Respuesta (200):**
```json
{
  "registros": [
    {
      "id": 1,
      "titulo": "CREAR_OBRA",
      "contexto": "{...}",
      "entidad": "obra",
      "entidad_id": "5",
      "ip_address": "::1",
      "fecha": "2026-04-12T10:30:00.000Z",
      "usuario_nombre": "Carlos",
      "usuario_apellido": "Administrador",
      "usuario_rol": "administrador"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 1
}
```

### Tipos de Eventos de Auditoria

| Evento | Entidad | Descripcion |
|---|---|---|
| `CREAR_USUARIO` | usuario | Registro de nuevo usuario |
| `CAMBIAR_CONTRASENA` | usuario | Cambio de contrasena propia |
| `CREAR_OBRA` | obra | Creacion de una nueva obra |
| `ACTUALIZAR_OBRA` | obra | Modificacion de datos de una obra |
| `ELIMINAR_OBRA` | obra | Eliminacion de una obra |
| `ELIMINAR_ARCHIVO` | archivos_obra | Eliminacion de un archivo |
| `CAMBIAR_ROL` | usuario | Cambio de rol de un usuario |
| `TOGGLE_ACTIVO` | usuario | Activacion/desactivacion de usuario |

---

## Notificaciones

### `GET /api/notificaciones`

Obtiene notificaciones de cambios recientes en obras (ultimas 24 horas).

**Autenticacion:** Requerida

**Respuesta (200):**
```json
{
  "alertas": [
    {
      "id": 1,
      "tipo": "success",
      "titulo": "Obra creada",
      "detalle": "Se agrego una nueva obra al sistema",
      "obra": "Planta Potabilizadora Capital",
      "usuario": "Carlos Administrador",
      "fecha": "12/04/2026, 10:30"
    }
  ]
}
```

---

## Reportes

### `GET /api/reportes/obras-csv`

Descarga un archivo CSV con los datos de las obras.

**Autenticacion:** Requerida

**Query params:**
| Parametro | Tipo | Descripcion |
|---|---|---|
| `tipo` | string | Filtrar por tipo (`pozo`, `planta`, `all`) |
| `estado` | string | Filtrar por estado |

**Respuesta:** Archivo CSV con encoding UTF-8 BOM para compatibilidad con Excel.

**Columnas del CSV:** Nombre, Tipo, Ubicacion, Localidad, Estado, Responsable, Empresa, Ano, Latitud, Longitud, Avance %, Descripcion, Creado por, Fecha creacion.

---

## Errores Comunes

Todas las respuestas de error siguen el formato:

```json
{
  "error": "Descripcion del error"
}
```

| Codigo | Significado |
|---|---|
| 400 | Datos de entrada invalidos o incompletos |
| 401 | Token invalido, expirado o no proporcionado |
| 403 | Sin permisos suficientes para la accion |
| 404 | Recurso no encontrado |
| 409 | Conflicto (registro duplicado) |
| 429 | Demasiadas solicitudes (rate limit) |
| 500 | Error interno del servidor |

### Rate Limiting

- **Ventana:** 15 minutos
- **Maximo:** 200 requests por IP
- **Aplica a:** Todas las rutas bajo `/api/`
