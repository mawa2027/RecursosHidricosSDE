import { Router } from 'express';
import { query, pool } from '../database/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();

const ROLES_VALIDOS = ['administrador', 'presidente', 'inspector', 'dpto_construccion', 'dpto_estudios', 'dpto_conservacion'];

// Todas las rutas de usuarios requieren autenticación + rol admin
router.use(authenticate);
router.use(authorize('administrador'));

// ─── Listar todos los usuarios ──────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, rol, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT id, nombre, apellido, correo, rol, activo, created_at, updated_at
      FROM usuarios WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (nombre LIKE ? OR apellido LIKE ? OR correo LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (rol) {
      sql += ` AND rol = ?`;
      params.push(rol);
    }

    const countSql = `SELECT COUNT(*) as total FROM usuarios WHERE 1=1` + sql.split('WHERE 1=1')[1];
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [users] = await pool.query(sql, params);

    res.json({
      usuarios: users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

// ─── Obtener usuario por ID ─────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, nombre, apellido, correo, rol, activo, created_at, updated_at
       FROM usuarios WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Contar obras creadas por este usuario
    const obrasCount = await query(
      'SELECT COUNT(*) as total FROM obras WHERE created_by = ?',
      [req.params.id]
    );

    res.json({
      usuario: {
        ...rows[0],
        obras_creadas: parseInt(obrasCount[0].total),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Cambiar rol de usuario ─────────────────────────
router.patch(
  '/:id/role',
  auditLog('CAMBIAR_ROL', 'usuario'),
  async (req, res, next) => {
    try {
      const { rol } = req.body;

      if (!ROLES_VALIDOS.includes(rol)) {
        return res.status(400).json({ error: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(', ')}` });
      }

      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
      }

      const [result] = await pool.query(
        'UPDATE usuarios SET rol = ? WHERE id = ?',
        [rol, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const [user] = await query(
        'SELECT id, nombre, apellido, correo, rol, activo FROM usuarios WHERE id = ?',
        [req.params.id]
      );

      res.json({ usuario: user, message: `Rol actualizado a "${rol}"` });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Activar / Desactivar usuario ───────────────────
router.patch(
  '/:id/toggle-active',
  auditLog('TOGGLE_ACTIVO', 'usuario'),
  async (req, res, next) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
      }

      const [result] = await pool.query(
        'UPDATE usuarios SET activo = NOT activo WHERE id = ?',
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const [user] = await query(
        'SELECT id, nombre, apellido, correo, rol, activo FROM usuarios WHERE id = ?',
        [req.params.id]
      );

      const status = user.activo ? 'activado' : 'desactivado';
      res.json({ usuario: user, message: `Usuario ${status} correctamente` });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

