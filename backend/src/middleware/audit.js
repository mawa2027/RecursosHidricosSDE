import { query } from '../database/connection.js';

export const auditLog = (titulo, entidad) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      // Solo registrar si la respuesta fue exitosa
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entidadId = req.params.id || data?.id || null;
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const contexto = JSON.stringify({ method: req.method, path: req.path, body: req.body });

        query(
          `INSERT INTO auditoria (usuario_id, titulo, contexto, entidad, entidad_id, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.user?.id || null, titulo, contexto, entidad, entidadId, ip]
        ).catch((err) => console.error('Error en auditoria:', err.message));
      }

      return originalJson(data);
    };

    next();
  };
};

