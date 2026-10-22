// Servicio centralizado para comunicarse con el backend
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api';

// Helper para hacer requests con token JWT
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // Si el body es FormData (para archivos), no poner Content-Type
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    const errorMessage = data.error || 'No autorizado';

    const expiredTokenErrors = [
      'Token expirado, inicie sesión nuevamente',
      'Token inválido',
      'Token de autenticación requerido',
      'No autenticado',
    ];

    if (expiredTokenErrors.some((msg) => errorMessage.includes(msg))) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }

  return data;
}

// ═══ AUTH ═══
export const authAPI = {
  login: (correo, contrasena) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  me: () => request('/auth/me'),

  resetPassword: (usuario_id, nueva_contrasena) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ usuario_id, nueva_contrasena }),
    }),

  changePassword: (contrasena_actual, nueva_contrasena) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ contrasena_actual, nueva_contrasena }),
    }),

  updateProfile: (data) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ═══ OBRAS ═══
export const obrasAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/obras${query ? `?${query}` : ''}`);
  },

  getById: (id) => request(`/obras/${id}`),

  create: (obraData) =>
    request('/obras', {
      method: 'POST',
      body: JSON.stringify(obraData),
    }),

  update: (id, obraData) =>
    request(`/obras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(obraData),
    }),

  delete: (id) =>
    request(`/obras/${id}`, { method: 'DELETE' }),
};

// ═══ ARCHIVOS ═══
export const archivosAPI = {
  list: (obraId) => request(`/archivos/${obraId}`),

  upload: (obraId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/archivos/${obraId}`, {
      method: 'POST',
      body: formData,
    });
  },

  download: (fileId) => `${API_BASE}/archivos/download/${fileId}`,

  delete: (fileId) =>
    request(`/archivos/${fileId}`, { method: 'DELETE' }),
};

// ═══ DASHBOARD ═══
export const dashboardAPI = {
  stats: () => request('/dashboard/stats'),
  activity: (limit = 10) => request(`/dashboard/activity?limit=${limit}`),
  enConstruccion: () => request('/dashboard/en-construccion'),
  chartData: () => request('/dashboard/chart-data'),
};

// ═══ USUARIOS ═══
export const usuariosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/usuarios${query ? `?${query}` : ''}`);
  },

  getById: (id) => request(`/usuarios/${id}`),

  changeRole: (id, rol) =>
    request(`/usuarios/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ rol }),
    }),

  toggleActive: (id) =>
    request(`/usuarios/${id}/toggle-active`, { method: 'PATCH' }),
};

// ═══ REPORTES ═══
export const reportesAPI = {
  downloadCSV: (params = {}) => {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}/reportes/obras-csv${query ? `?${query}` : ''}`;
    // Descargar como blob
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      if (!res.ok) throw new Error('Error al descargar');
      return res.blob();
    }).then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `obras_hidricas_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  },
};

// ═══ AUDITORÍA ═══
export const auditoriaAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/auditoria${query ? `?${query}` : ''}`);
  },
};

// ═══ NOTIFICACIONES ═══
export const notificacionesAPI = {
  get: () => request('/notificaciones'),
};

export default { authAPI, obrasAPI, archivosAPI, dashboardAPI, usuariosAPI, reportesAPI, auditoriaAPI, notificacionesAPI };
