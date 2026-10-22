// ═══════════════════════════════════════════════════════
// SISTEMA DE PERMISOS POR ROL
// Recursos Hídricos SDE
// ═══════════════════════════════════════════════════════

/**
 * Matriz de permisos por rol:
 *
 * ADMINISTRADOR  – Acceso total: CRUD obras, gestión de usuarios, auditoría, archivos
 * PRESIDENTE     – Supervisión general: ver todo, crear/editar/eliminar obras, ver auditoría
 * INSPECTOR      – Inspección en campo: ver obras, subir informes/archivos, NO editar obras
 * DPT_CONSTRUCCION – Departamento Construcción: crear y editar todas las obras, subir archivos
 * DPT_ESTUDIOS     – Departamento Estudios: crear y editar obras (estudios), subir archivos
 * DPT_CONSERVACION – Departamento Conservación: ver obras, editar todas las obras, subir informes de conservación
 */

const PERMISOS = {
  administrador: {
    label: 'Administrador',
    dashboard:        true,
    verObras:         true,
    crearObra:        true,
    editarObra:       true,   // todas
    editarSoloSuyas:  false,
    eliminarObra:     true,
    subirArchivos:    true,
    eliminarArchivos: true,
    eliminarSoloSuyos: false,
    gestionarUsuarios: true,
    verAuditoria:     true,
    verUsuariosMenu:  true,
  },
  presidente: {
    label: 'Presidente',
    dashboard:        true,
    verObras:         true,
    crearObra:        true,
    editarObra:       true,   // todas
    editarSoloSuyas:  false,
    eliminarObra:     true,
    subirArchivos:    true,
    eliminarArchivos: true,
    eliminarSoloSuyos: false,
    gestionarUsuarios: false,
    verAuditoria:     true,
    verUsuariosMenu:  false,
  },
  inspector: {
    label: 'Inspector',
    dashboard:        true,
    verObras:         true,
    crearObra:        false,
    editarObra:       false,
    editarSoloSuyas:  false,
    eliminarObra:     false,
    subirArchivos:    true,  // informes de inspección
    eliminarArchivos: false,
    eliminarSoloSuyos: false,
    gestionarUsuarios: false,
    verAuditoria:     false,
    verUsuariosMenu:  false,
  },
  dpto_construccion: {
    label: 'Dpto. Construcción',
    dashboard:        true,
    verObras:         true,
    crearObra:        true,
    editarObra:       true,
    editarSoloSuyas:  false,
    eliminarObra:     false,
    subirArchivos:    true,
    eliminarArchivos: true,
    eliminarSoloSuyos: true,  // solo archivos que subió
    gestionarUsuarios: false,
    verAuditoria:     false,
    verUsuariosMenu:  false,
  },
  dpto_estudios: {
    label: 'Dpto. Estudios',
    dashboard:        true,
    verObras:         true,
    crearObra:        true,
    editarObra:       true,
    editarSoloSuyas:  true,   // solo las que creó
    eliminarObra:     false,
    subirArchivos:    true,
    eliminarArchivos: true,
    eliminarSoloSuyos: true,
    gestionarUsuarios: false,
    verAuditoria:     false,
    verUsuariosMenu:  false,
  },
  dpto_conservacion: {
    label: 'Dpto. Conservación',
    dashboard:        true,
    verObras:         true,
    crearObra:        false,
    editarObra:       true,
    editarSoloSuyas:  false,
    eliminarObra:     false,
    subirArchivos:    true,   // informes de conservación
    eliminarArchivos: false,
    eliminarSoloSuyos: false,
    gestionarUsuarios: false,
    verAuditoria:     false,
    verUsuariosMenu:  false,
  },
};

/**
 * Obtener permisos para un rol
 * @param {string} rol - El rol del usuario
 * @returns {object} Objeto con los permisos del rol
 */
export function getPermisos(rol) {
  return PERMISOS[rol] || PERMISOS.inspector; // fallback seguro: inspector (menos privilegios)
}

/**
 * Verificar si un usuario puede editar una obra específica
 * @param {object} user - El usuario logueado { id, rol }
 * @param {object} obra - La obra { created_by }
 * @returns {boolean}
 */
export function puedeEditarObra(user, obra) {
  const permisos = getPermisos(user?.rol);
  if (!permisos.editarObra) return false;
  if (permisos.editarSoloSuyas) {
    return obra?.created_by === user?.id;
  }
  return true;
}

/**
 * Verificar si un usuario puede eliminar un archivo
 * @param {object} user - El usuario logueado { id, rol }
 * @param {object} archivo - El archivo { subido_por }
 * @returns {boolean}
 */
export function puedeEliminarArchivo(user, archivo) {
  const permisos = getPermisos(user?.rol);
  if (!permisos.eliminarArchivos) return false;
  if (permisos.eliminarSoloSuyos) {
    return archivo?.subido_por === user?.id;
  }
  return true;
}

/**
 * Nombre amigable del rol
 */
export function getRolLabel(rol) {
  return PERMISOS[rol]?.label || rol;
}

export default PERMISOS;
