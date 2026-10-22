# Sistema de Roles y Permisos

El sistema implementa un modelo RBAC (Role-Based Access Control) con 6 roles predefinidos. Cada rol tiene un conjunto fijo de permisos que determina que acciones puede realizar en el sistema.

## Roles Disponibles

| Rol | Codigo | Descripcion |
|---|---|---|
| Administrador | `administrador` | Acceso total al sistema. CRUD completo de obras, gestion de usuarios, auditoria y archivos. |
| Presidente | `presidente` | Supervision general. Puede ver y gestionar todo excepto usuarios. Acceso a auditoria. |
| Inspector | `inspector` | Inspeccion en campo. Solo puede ver obras y subir informes/archivos. No puede crear ni editar obras. |
| Dpto. Construccion | `dpto_construccion` | Departamento de construccion. Puede crear y editar sus propias obras y gestionar sus archivos. |
| Dpto. Estudios | `dpto_estudios` | Departamento de estudios. Puede crear y editar sus propias obras y gestionar sus archivos. |
| Dpto. Conservacion | `dpto_conservacion` | Departamento de conservacion. Solo puede ver obras y subir informes de conservacion. |

## Matriz de Permisos

| Permiso | Administrador | Presidente | Inspector | Dpto. Construccion | Dpto. Estudios | Dpto. Conservacion |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Ver Dashboard | Si | Si | Si | Si | Si | Si |
| Ver Obras | Si | Si | Si | Si | Si | Si |
| Crear Obra | Si | Si | No | Si | Si | No |
| Editar Obra (todas) | Si | Si | No | No | No | No |
| Editar Obra (propias) | - | - | No | Si | Si | No |
| Eliminar Obra | Si | Si | No | No | No | No |
| Subir Archivos | Si | Si | Si | Si | Si | Si |
| Eliminar Archivos (todos) | Si | Si | No | No | No | No |
| Eliminar Archivos (propios) | - | - | No | Si | Si | No |
| Gestionar Usuarios | Si | No | No | No | No | No |
| Ver Auditoria | Si | Si | No | No | No | No |
| Ver Menu Usuarios | Si | No | No | No | No | No |

## Detalle por Rol

### Administrador

El rol con mayor nivel de privilegios. Tiene acceso completo a todas las funcionalidades:

- **Obras**: Crear, ver, editar y eliminar cualquier obra del sistema.
- **Archivos**: Subir y eliminar archivos de cualquier obra.
- **Usuarios**: Ver listado, cambiar roles, activar/desactivar cuentas, restablecer contrasenas.
- **Auditoria**: Acceso completo al log de auditoria.
- **Dashboard**: Estadisticas completas con actividad reciente.

### Presidente

Rol de supervision con acceso amplio pero sin gestion de usuarios:

- **Obras**: Crear, ver, editar y eliminar cualquier obra.
- **Archivos**: Subir y eliminar archivos de cualquier obra.
- **Usuarios**: Sin acceso a gestion de usuarios.
- **Auditoria**: Acceso completo al log de auditoria.

### Inspector

Rol de campo con permisos limitados:

- **Obras**: Solo puede ver las obras existentes.
- **Archivos**: Puede subir informes de inspeccion pero no eliminarlos.
- **Usuarios**: Sin acceso.
- **Auditoria**: Sin acceso.

### Dpto. Construccion / Dpto. Estudios

Roles departamentales con permisos intermedios:

- **Obras**: Puede crear nuevas obras y editar unicamente las que el mismo creo.
- **Archivos**: Puede subir archivos y eliminar solo los que el mismo subio.
- **Usuarios**: Sin acceso.
- **Auditoria**: Sin acceso.

### Dpto. Conservacion

Rol de conservacion con permisos limitados:

- **Obras**: Solo puede ver las obras existentes.
- **Archivos**: Puede subir informes de conservacion pero no eliminarlos.
- **Usuarios**: Sin acceso.
- **Auditoria**: Sin acceso.

## Implementacion Tecnica

### Frontend (`frontend/src/lib/permissions.js`)

La matriz de permisos se define como un objeto JavaScript que mapea cada rol a sus permisos:

```javascript
const PERMISOS = {
  administrador: {
    dashboard: true,
    verObras: true,
    crearObra: true,
    editarObra: true,
    editarSoloSuyas: false,
    eliminarObra: true,
    subirArchivos: true,
    eliminarArchivos: true,
    eliminarSoloSuyos: false,
    gestionarUsuarios: true,
    verAuditoria: true,
    verUsuariosMenu: true,
  },
  // ... otros roles
};
```

**Funciones auxiliares:**

- `getPermisos(rol)` - Devuelve los permisos de un rol. Fallback: permisos de `inspector`.
- `puedeEditarObra(user, obra)` - Verifica si un usuario puede editar una obra especifica.
- `puedeEliminarArchivo(user, archivo)` - Verifica si un usuario puede eliminar un archivo especifico.
- `getRolLabel(rol)` - Devuelve el nombre legible del rol.

### Backend (`server.js`)

El backend replica la misma matriz de permisos y la aplica en cada endpoint:

```javascript
const PERMISOS_ROL = {
  administrador: { crearObra: true, editarObra: true, ... },
  // ...
};

function getPermisos(rol) {
  return PERMISOS_ROL[rol] || PERMISOS_ROL.inspector;
}
```

**Middlewares de autorizacion:**

- `authenticateToken` - Verifica el JWT y extrae `userId` y `rol`.
- `loadUser` - Carga datos completos del usuario desde la BD (incluye check de `activo`).
- `authorize(...roles)` - Middleware compuesto que permite solo ciertos roles.
- `authorizeGestionUsuarios` - Verifica permiso `gestionarUsuarios` en el rol.

### Rutas del Frontend por Permiso

| Ruta | Guard | Permisos Requeridos |
|---|---|---|
| `/` | Ninguno | Publica |
| `/login` | Ninguno | Publica |
| `/register` | Ninguno | Publica |
| `/dashboard` | `PrivateRoute` | Autenticado |
| `/plantas` | `PrivateRoute` | Autenticado |
| `/plantas/:id` | `PrivateRoute` | Autenticado |
| `/mapa` | `PrivateRoute` | Autenticado |
| `/perfil` | `PrivateRoute` | Autenticado |
| `/usuarios` | `AdminRoute` | `gestionarUsuarios` |
| `/auditoria` | `AuditRoute` | `verAuditoria` |

### Elementos del Menu (Sidebar)

El sidebar del `DashboardLayout` filtra los items del menu segun los permisos del usuario:

| Item | Visible para |
|---|---|
| Dashboard | Todos |
| Obras | Todos |
| Mapa | Todos |
| Mi Perfil | Todos |
| Usuarios | Solo roles con `gestionarUsuarios` |
| Auditoria | Solo roles con `verAuditoria` |
