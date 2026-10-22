import { Router } from 'express';
import { query } from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// ─── Estadísticas generales ─────────────────────────
router.get('/stats', async (_req, res, next) => {
  try {
    const [totalResult, statusResult, tipoResult, filesResult] = await Promise.all([
      query('SELECT COUNT(*) as total FROM obras'),
      query('SELECT estado, COUNT(*) as count FROM obras GROUP BY estado'),
      query('SELECT tipo, COUNT(*) as count FROM obras GROUP BY tipo'),
      query('SELECT COUNT(*) as total, COALESCE(SUM(tamano), 0) as total_size FROM archivos_obra'),
    ]);

    const estadoCounts = {
      en_funcionamiento: 0,
      en_reparacion: 0,
      fuera_de_servicio: 0,
      en_construccion: 0,
    };
    statusResult.forEach((row) => {
      estadoCounts[row.estado] = parseInt(row.count);
    });

    const tipoCounts = { pozo: 0, planta: 0 };
    tipoResult.forEach((row) => {
      tipoCounts[row.tipo] = parseInt(row.count);
    });

    res.json({
      stats: {
        totalObras: parseInt(totalResult[0].total),
        enFuncionamiento: estadoCounts.en_funcionamiento,
        enReparacion: estadoCounts.en_reparacion,
        fueraDeServicio: estadoCounts.fuera_de_servicio,
        enConstruccion: estadoCounts.en_construccion,
        totalPozos: tipoCounts.pozo,
        totalPlantas: tipoCounts.planta,
        totalArchivos: parseInt(filesResult[0].total),
        totalArchivosSize: parseInt(filesResult[0].total_size),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Actividad reciente (auditoría) ──────────────────
router.get('/activity', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const activity = await query(
      `SELECT a.id, a.titulo, a.contexto, a.entidad, a.entidad_id,
              a.fecha, u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ORDER BY a.fecha DESC
       LIMIT ?`,
      [Number(limit)]
    );

    res.json({ activity });
  } catch (error) {
    next(error);
  }
});

// ─── Obras en construcción (% avance) ────────────────
router.get('/en-construccion', async (_req, res, next) => {
  try {
    const obras = await query(`
      SELECT id, nombre, ubicacion, localidad, responsable, porcentaje_avance, empresa
      FROM obras
      WHERE estado = 'en_construccion'
      ORDER BY porcentaje_avance ASC
    `);

    res.json({ obras });
  } catch (error) {
    next(error);
  }
});

// ─── Distribución de estados para gráfico ────────────
router.get('/chart-data', async (_req, res, next) => {
  try {
    const [statusData, tipoData, monthlyData] = await Promise.all([
      query('SELECT estado, COUNT(*) as count FROM obras GROUP BY estado'),
      query('SELECT tipo, COUNT(*) as count FROM obras GROUP BY tipo'),
      query(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') as mes,
          COUNT(*) as count
        FROM obras
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY mes ASC
      `),
    ]);

    res.json({
      distribucionEstados: statusData,
      distribucionTipos: tipoData,
      creacionMensual: monthlyData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

