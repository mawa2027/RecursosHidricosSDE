import { Router } from 'express';
import { query, pool } from '../database/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();

router.use(authenticate);

// ─── Listar obras con filtros (CU-BÚSQUEDA: por etiquetas y filtros) ──
router.get('/', async (req, res, next) => {
  try {
    const { tipo, estado, responsable, localidad, anio, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT o.*, u.nombre as creado_por_nombre, u.apellido as creado_por_apellido
      FROM obras o
      LEFT JOIN usuarios u ON o.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (tipo && tipo !== 'all') {
      sql += ` AND o.tipo = ?`;
      params.push(tipo);
    }

    if (estado && estado !== 'all') {
      sql += ` AND o.estado = ?`;
      params.push(estado);
    }

    if (responsable) {
      sql += ` AND o.responsable LIKE ?`;
      params.push(`%${responsable}%`);
    }

    if (localidad) {
      sql += ` AND o.localidad LIKE ?`;
      params.push(`%${localidad}%`);
    }

    if (anio) {
      sql += ` AND o.anio = ?`;
      params.push(Number(anio));
    }

    if (search) {
      sql += ` AND (o.nombre LIKE ? OR o.ubicacion LIKE ? OR o.responsable LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Contar total
    const countSql = `SELECT COUNT(*) as total FROM obras o LEFT JOIN usuarios u ON o.created_by = u.id WHERE 1=1` + sql.split('WHERE 1=1')[1].split('ORDER BY')[0];
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [obras] = await pool.query(sql, params);

    res.json({
      obras,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

// ─── Obtener obra por ID (con datos específicos pozo/planta) ──
router.get('/:id', async (req, res, next) => {
  try {
    const obras = await query(
      `SELECT o.*, u.nombre as creado_por_nombre, u.apellido as creado_por_apellido
       FROM obras o
       LEFT JOIN usuarios u ON o.created_by = u.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (obras.length === 0) {
      return res.status(404).json({ error: 'Obra no encontrada' });
    }

    const obra = obras[0];

    // Obtener datos específicos según tipo
    if (obra.tipo === 'pozo') {
      const pozos = await query('SELECT * FROM pozos WHERE id = ?', [obra.id]);
      if (pozos.length > 0) {
        obra.datos_pozo = pozos[0];
      }
    } else if (obra.tipo === 'planta') {
      const plantas = await query('SELECT * FROM plantas WHERE id = ?', [obra.id]);
      if (plantas.length > 0) {
        obra.datos_planta = plantas[0];
      }
    }

    // Obtener archivos
    const archivos = await query(
      `SELECT id, nombre_original, nombre_guardado, mime_type, tamano, created_at
       FROM archivos_obra WHERE obra_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );

    obra.archivos = archivos;

    res.json({ obra });
  } catch (error) {
    next(error);
  }
});

// ─── Crear obra (CU-01: Registrar obra/planta/pozo) ──
router.post(
  '/',
  auditLog('CREAR_OBRA', 'obra'),
  validate({
    tipo: { required: true, enum: ['pozo', 'planta'], label: 'Tipo' },
    nombre: { required: true, minLength: 2, maxLength: 255, label: 'Nombre' },
    ubicacion: { required: true, minLength: 2, label: 'Ubicación' },
    responsable: { required: true, minLength: 2, label: 'Responsable' },
    estado: { required: true, enum: ['en_funcionamiento', 'en_reparacion', 'fuera_de_servicio', 'en_construccion'], label: 'Estado' },
  }),
  async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        tipo, nombre, ubicacion, empresa, responsable, estado, anio,
        latitud, longitud, descripcion, porcentaje_avance, localidad,
        // Datos específicos pozo
        profundidad, caudal, tipo_bomba, contaminantes,
        // Datos específicos planta
        tratamiento, capacidad, fuente,
      } = req.body;

      const [insertResult] = await conn.query(
        `INSERT INTO obras (tipo, nombre, ubicacion, empresa, responsable, estado, anio, latitud, longitud, descripcion, porcentaje_avance, localidad, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tipo, nombre, ubicacion, empresa || null, responsable, estado, anio || null, latitud || null, longitud || null, descripcion || null, porcentaje_avance ?? 100, localidad || null, req.user.id]
      );
      const id = insertResult.insertId;

      // Insertar datos específicos según tipo
      if (tipo === 'pozo') {
        await conn.query(
          'INSERT INTO pozos (id, profundidad, caudal, tipo_bomba, contaminantes) VALUES (?, ?, ?, ?, ?)',
          [id, profundidad || null, caudal || null, tipo_bomba || null, contaminantes || null]
        );
      } else if (tipo === 'planta') {
        await conn.query(
          'INSERT INTO plantas (id, tratamiento, capacidad, fuente) VALUES (?, ?, ?, ?)',
          [id, tratamiento || null, capacidad || null, fuente || null]
        );
      }

      await conn.commit();

      const [obra] = await query('SELECT * FROM obras WHERE id = ?', [id]);

      res.status(201).json({ obra, id });
    } catch (error) {
      await conn.rollback();
      next(error);
    } finally {
      conn.release();
    }
  }
);

// ─── Actualizar obra ─────────────────────────────────
router.put(
  '/:id',
  auditLog('ACTUALIZAR_OBRA', 'obra'),
  validate({
    nombre: { required: true, minLength: 2, maxLength: 255, label: 'Nombre' },
    ubicacion: { required: true, minLength: 2, label: 'Ubicación' },
    responsable: { required: true, minLength: 2, label: 'Responsable' },
    estado: { required: true, enum: ['en_funcionamiento', 'en_reparacion', 'fuera_de_servicio', 'en_construccion'], label: 'Estado' },
  }),
  async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        nombre, ubicacion, empresa, responsable, estado, anio,
        latitud, longitud, descripcion, porcentaje_avance, localidad,
        profundidad, caudal, tipo_bomba, contaminantes,
        tratamiento, capacidad, fuente,
      } = req.body;

      const [result] = await conn.query(
        `UPDATE obras
         SET nombre = ?, ubicacion = ?, empresa = ?, responsable = ?, estado = ?,
             anio = ?, latitud = ?, longitud = ?, descripcion = ?,
             porcentaje_avance = ?, localidad = ?
         WHERE id = ?`,
        [nombre, ubicacion, empresa || null, responsable, estado, anio || null, latitud || null, longitud || null, descripcion || null, porcentaje_avance ?? 100, localidad || null, req.params.id]
      );

      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Obra no encontrada' });
      }

      // Obtener tipo para actualizar subtabla
      const obras = await query('SELECT tipo FROM obras WHERE id = ?', [req.params.id]);
      const tipo = obras[0]?.tipo;

      if (tipo === 'pozo') {
        await conn.query(
          `UPDATE pozos SET profundidad = ?, caudal = ?, tipo_bomba = ?, contaminantes = ? WHERE id = ?`,
          [profundidad || null, caudal || null, tipo_bomba || null, contaminantes || null, req.params.id]
        );
      } else if (tipo === 'planta') {
        await conn.query(
          `UPDATE plantas SET tratamiento = ?, capacidad = ?, fuente = ? WHERE id = ?`,
          [tratamiento || null, capacidad || null, fuente || null, req.params.id]
        );
      }

      await conn.commit();

      const [obra] = await query('SELECT * FROM obras WHERE id = ?', [req.params.id]);
      res.json({ obra });
    } catch (error) {
      await conn.rollback();
      next(error);
    } finally {
      conn.release();
    }
  }
);

// ─── Eliminar obra (solo admin y presidente) ─────────
router.delete(
  '/:id',
  authorize('administrador', 'presidente'),
  auditLog('ELIMINAR_OBRA', 'obra'),
  async (req, res, next) => {
    try {
      const obras = await query('SELECT id, nombre, tipo FROM obras WHERE id = ?', [req.params.id]);

      if (obras.length === 0) {
        return res.status(404).json({ error: 'Obra no encontrada' });
      }

      // CASCADE borra pozos/plantas y archivos automáticamente
      await query('DELETE FROM obras WHERE id = ?', [req.params.id]);

      res.json({ message: 'Obra eliminada correctamente', obra: obras[0] });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
