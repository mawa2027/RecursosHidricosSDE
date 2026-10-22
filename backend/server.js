// Backend/server.js — Recursos Hídricos SDE
// CommonJS (igual que el proyecto de Obleas)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'recursos-hidricos-sde-secret';

// ─── Middlewares ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
});
app.use('/api/', limiter);

// ─── Pool de MySQL ───────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'recursos_hidricos_sde',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// Verificar conexión al iniciar
(async () => {
  try {
    const c = await pool.getConnection();
    console.log(`✅ MySQL conectado a "${c.config.database}"`);
    c.release();
  } catch (e) {
    console.error('❌ Error conectando a MySQL:', e.message);
  }
})();

// ─── Configurar uploads ──────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  },
});

// ═══════════════════════════════════════════════════════
// MIDDLEWARES DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════════

const ROLES_VALIDOS = ['administrador', 'presidente', 'inspector', 'dpto_construccion', 'dpto_estudios', 'dpto_conservacion'];

// Permisos por rol (espejo de frontend/src/lib/permissions.js)
const PERMISOS_ROL = {
  administrador:     { crearObra: true,  editarObra: true,  editarSoloSuyas: false, eliminarObra: true,  subirArchivos: true,  eliminarArchivos: true,  eliminarSoloSuyos: false, gestionarUsuarios: true,  verAuditoria: true  },
  presidente:        { crearObra: true,  editarObra: true,  editarSoloSuyas: false, eliminarObra: true,  subirArchivos: true,  eliminarArchivos: true,  eliminarSoloSuyos: false, gestionarUsuarios: false, verAuditoria: true  },
  inspector:         { crearObra: false, editarObra: false, editarSoloSuyas: false, eliminarObra: false, subirArchivos: true,  eliminarArchivos: false, eliminarSoloSuyos: false, gestionarUsuarios: false, verAuditoria: false },
  dpto_construccion: { crearObra: true,  editarObra: true,  editarSoloSuyas: true,  eliminarObra: false, subirArchivos: true,  eliminarArchivos: true,  eliminarSoloSuyos: true,  gestionarUsuarios: false, verAuditoria: false },
  dpto_estudios:     { crearObra: true,  editarObra: true,  editarSoloSuyas: true,  eliminarObra: false, subirArchivos: true,  eliminarArchivos: true,  eliminarSoloSuyos: true,  gestionarUsuarios: false, verAuditoria: false },
  dpto_conservacion: { crearObra: false, editarObra: false, editarSoloSuyas: false, eliminarObra: false, subirArchivos: true,  eliminarArchivos: false, eliminarSoloSuyos: false, gestionarUsuarios: false, verAuditoria: false },
};

function getPermisos(rol) {
  return PERMISOS_ROL[rol] || PERMISOS_ROL.inspector;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado, inicie sesión nuevamente' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Middleware para cargar datos del usuario completo desde DB
async function loadUser(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, apellido, correo, rol, activo FROM usuarios WHERE id = ?',
      [req.user.userId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    if (!rows[0].activo) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }
    req.userInfo = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

function authorize(...roles) {
  return [authenticateToken, loadUser, (req, res, next) => {
    if (!roles.includes(req.userInfo.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  }];
}

// Audit log helper (fire-and-forget)
function auditLog(userId, titulo, entidad, entidadId, ip, contexto) {
  pool.query(
    'INSERT INTO auditoria (usuario_id, titulo, contexto, entidad, entidad_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, titulo, JSON.stringify(contexto), entidad, entidadId, ip]
  ).catch(err => console.error('Audit error:', err.message));
}

// ═══════════════════════════════════════════════════════
// RUTA RAÍZ
// ═══════════════════════════════════════════════════════

app.get('/', (_req, res) => {
  res.json({
    name: 'Recursos Hídricos SDE - API',
    version: '1.0.0',
    endpoints: ['/api/auth', '/api/obras', '/api/archivos', '/api/dashboard', '/api/usuarios'],
  });
});

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// ═══════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const [rows] = await pool.query(
      'SELECT id, nombre, apellido, correo, contrasena, rol, activo FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    const validPassword = await bcrypt.compare(contrasena, user.contrasena);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, rol: user.rol },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.correo,
        rol: user.rol,
      },
      permisos: getPermisos(user.rol),
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener perfil actual (con permisos)
app.get('/api/auth/me', authenticateToken, loadUser, (req, res) => {
  const permisos = getPermisos(req.userInfo.rol);
  res.json({ user: req.userInfo, permisos });
});

// Registro público (self-register)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, apellido, correo, contrasena, rol } = req.body;

    if (!nombre || !apellido || !correo || !contrasena || !rol) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido. Debe ser: ${ROLES_VALIDOS.join(', ')}` });
    }

    const [existing] = await pool.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 12);

    await pool.query(
      'INSERT INTO usuarios (nombre, apellido, correo, contrasena, rol) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellido, correo, hashedPassword, rol]
    );

    const [newUser] = await pool.query(
      'SELECT id, nombre, apellido, correo, rol, created_at FROM usuarios WHERE correo = ?',
      [correo]
    );

    auditLog(newUser[0].id, 'CREAR_USUARIO', 'usuario', newUser[0].id, req.ip, { correo, rol });

    res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser[0] });
  } catch (err) {
    console.error('Error en register:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reset password (admin)
app.post('/api/auth/reset-password', authenticateToken, loadUser, async (req, res) => {
  try {
    if (req.userInfo.rol !== 'administrador') {
      return res.status(403).json({ error: 'Solo el administrador puede restablecer contraseñas' });
    }

    const { usuario_id, nueva_contrasena } = req.body;
    if (!usuario_id || !nueva_contrasena) {
      return res.status(400).json({ error: 'ID de usuario y nueva contraseña son requeridos' });
    }

    const [users] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [usuario_id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const hashed = await bcrypt.hash(nueva_contrasena, 12);
    await pool.query('UPDATE usuarios SET contrasena = ? WHERE id = ?', [hashed, usuario_id]);

    res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (err) {
    console.error('Error en reset-password:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar contraseña propia
app.post('/api/auth/change-password', authenticateToken, loadUser, async (req, res) => {
  try {
    const { contrasena_actual, nueva_contrasena } = req.body;
    if (!contrasena_actual || !nueva_contrasena) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }
    if (nueva_contrasena.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const [rows] = await pool.query('SELECT contrasena FROM usuarios WHERE id = ?', [req.userInfo.id]);
    const valid = await bcrypt.compare(contrasena_actual, rows[0].contrasena);
    if (!valid) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const hashed = await bcrypt.hash(nueva_contrasena, 12);
    await pool.query('UPDATE usuarios SET contrasena = ? WHERE id = ?', [hashed, req.userInfo.id]);

    auditLog(req.userInfo.id, 'CAMBIAR_CONTRASENA', 'usuario', req.userInfo.id, req.ip, {});

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error en change-password:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar perfil propio
app.put('/api/auth/profile', authenticateToken, loadUser, async (req, res) => {
  try {
    const { nombre, apellido } = req.body;
    if (!nombre || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }

    await pool.query('UPDATE usuarios SET nombre = ?, apellido = ? WHERE id = ?', [nombre, apellido, req.userInfo.id]);

    const [updated] = await pool.query(
      'SELECT id, nombre, apellido, correo, rol, activo, created_at FROM usuarios WHERE id = ?',
      [req.userInfo.id]
    );

    res.json({ user: updated[0], message: 'Perfil actualizado correctamente' });
  } catch (err) {
    console.error('Error en profile update:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// REPORTES ROUTES
// ═══════════════════════════════════════════════════════

// Exportar obras a CSV
app.get('/api/reportes/obras-csv', authenticateToken, async (req, res) => {
  try {
    const { tipo, estado } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (tipo && tipo !== 'all') { where += ' AND o.tipo = ?'; params.push(tipo); }
    if (estado && estado !== 'all') { where += ' AND o.estado = ?'; params.push(estado); }

    const [obras] = await pool.query(
      `SELECT o.nombre, o.tipo, o.ubicacion, o.localidad, o.estado, o.responsable, o.empresa,
              o.anio, o.latitud, o.longitud, o.porcentaje_avance, o.descripcion, o.created_at,
              u.nombre as creado_por_nombre, u.apellido as creado_por_apellido
       FROM obras o LEFT JOIN usuarios u ON o.created_by = u.id
       ${where} ORDER BY o.created_at DESC`,
      params
    );

    // Generar CSV
    const headers = ['Nombre', 'Tipo', 'Ubicación', 'Localidad', 'Estado', 'Responsable', 'Empresa', 'Año', 'Latitud', 'Longitud', 'Avance %', 'Descripción', 'Creado por', 'Fecha creación'];
    const csvRows = [headers.join(',')];
    for (const o of obras) {
      const row = [
        `"${(o.nombre || '').replace(/"/g, '""')}"`,
        o.tipo,
        `"${(o.ubicacion || '').replace(/"/g, '""')}"`,
        `"${(o.localidad || '').replace(/"/g, '""')}"`,
        o.estado,
        `"${(o.responsable || '').replace(/"/g, '""')}"`,
        `"${(o.empresa || '').replace(/"/g, '""')}"`,
        o.anio || '',
        o.latitud || '',
        o.longitud || '',
        o.porcentaje_avance ?? '',
        `"${(o.descripcion || '').replace(/"/g, '""')}"`,
        `"${o.creado_por_nombre || ''} ${o.creado_por_apellido || ''}"`,
        o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : '',
      ];
      csvRows.push(row.join(','));
    }

    const csv = '\uFEFF' + csvRows.join('\n'); // BOM para Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="obras_hidricas_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Error generando CSV:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// AUDITORÍA ROUTES
// ═══════════════════════════════════════════════════════

// Listado paginado de auditoría (admin/presidente)
app.get('/api/auditoria', authenticateToken, loadUser, async (req, res) => {
  const permisos = getPermisos(req.userInfo.rol);
  if (!permisos.verAuditoria) {
    return res.status(403).json({ error: 'No tienes permisos para ver la auditoría' });
  }

  try {
    const { search, entidad, page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (a.titulo LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (entidad && entidad !== 'all') {
      where += ' AND a.entidad = ?';
      params.push(entidad);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM auditoria a LEFT JOIN usuarios u ON a.usuario_id = u.id ${where}`,
      params
    );
    const total = countResult[0].total;

    const [registros] = await pool.query(
      `SELECT a.id, a.titulo, a.contexto, a.entidad, a.entidad_id, a.ip_address,
              a.fecha, u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.rol as usuario_rol
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ${where}
       ORDER BY a.fecha DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    res.json({
      registros,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error en auditoría:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Notificaciones: cambios recientes en obras
app.get('/api/notificaciones', authenticateToken, async (_req, res) => {
  try {
    const alertas = [];
    const actividadObras = await pool.query(
      `SELECT a.id, a.titulo, a.contexto, a.fecha, a.entidad_id,
              u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.entidad = 'obra'
         AND a.titulo IN ('CREAR_OBRA', 'ACTUALIZAR_OBRA', 'ELIMINAR_OBRA')
         AND a.fecha > DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY a.fecha DESC
       LIMIT 10`
    );

    (actividadObras[0] || []).forEach((evento) => {
      let contexto = {};
      try {
        contexto = evento.contexto ? JSON.parse(evento.contexto) : {};
      } catch (_error) {
        contexto = {};
      }

      const nombreObra = contexto.nombre || `obra ${evento.entidad_id}`;
      const usuario = [evento.usuario_nombre, evento.usuario_apellido].filter(Boolean).join(' ') || 'Sistema';
      const fechaEvento = new Date(evento.fecha).toLocaleString('es-DO', {
        dateStyle: 'short',
        timeStyle: 'short',
      });

      let tipo = 'info';
      let titulo = 'Obra actualizada';
      let detalle = 'Se registró un cambio en la obra';

      if (evento.titulo === 'CREAR_OBRA') {
        tipo = 'success';
        titulo = 'Obra creada';
        detalle = 'Se agregó una nueva obra al sistema';
      } else if (evento.titulo === 'ELIMINAR_OBRA') {
        tipo = 'danger';
        titulo = 'Obra eliminada';
        detalle = 'La obra fue eliminada del registro';
      } else if (evento.titulo === 'ACTUALIZAR_OBRA') {
        const estadoLabel = {
          en_funcionamiento: 'En Funcionamiento',
          en_reparacion: 'En Reparación',
          fuera_de_servicio: 'Fuera de Servicio',
          en_construccion: 'En Construcción',
          en_estudio: 'En Estudio',
        };

        const cambios = Array.isArray(contexto.cambios) ? contexto.cambios : [];
        const cambiosDescripcion = cambios.map((cambio) => {
          const nombreCampo = {
            estado: 'estado',
            porcentaje_avance: 'avance',
            nombre: 'nombre',
            ubicacion: 'ubicación',
            responsable: 'responsable',
            empresa: 'empresa',
            localidad: 'localidad',
          }[cambio.campo] || cambio.campo;

          if (cambio.campo === 'estado') {
            return `${nombreCampo} de ${cambio.anterior} a ${cambio.nuevo}`;
          }

          if (cambio.campo === 'porcentaje_avance') {
            return `${nombreCampo} de ${cambio.anterior} a ${cambio.nuevo}`;
          }

          return `${nombreCampo} de ${cambio.anterior} a ${cambio.nuevo}`;
        });

        if (cambiosDescripcion.length > 0) {
          detalle = `Se modificó ${cambiosDescripcion.join(' · ')}`;
        } else if (contexto.resumen?.estado || contexto.resumen?.porcentaje_avance !== undefined) {
          const estado = contexto.resumen?.estado ? `estado a ${contexto.resumen.estado}` : null;
          const avance = contexto.resumen?.porcentaje_avance !== undefined ? `avance a ${contexto.resumen.porcentaje_avance}%` : null;
          detalle = `Se actualizó ${[estado, avance].filter(Boolean).join(' y ')}`;
        } else if (contexto.body?.nombre) {
          detalle = `Se actualizó la información de ${contexto.body.nombre}`;
        } else {
          detalle = 'Se actualizó la información de la obra';
        }
      }

      alertas.push({
        id: evento.id,
        tipo,
        titulo,
        mensaje: `${titulo}: ${nombreObra}`,
        detalle: `${detalle} · ${usuario} · ${fechaEvento}`,
        obraId: evento.entidad_id,
        fecha: evento.fecha,
      });
    });

    res.json({
      alertas,
      totalAlertas: alertas.length,
    });
  } catch (err) {
    console.error('Error en notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// OBRAS ROUTES
// ═══════════════════════════════════════════════════════

// Listar obras con filtros
app.get('/api/obras', authenticateToken, async (req, res) => {
  try {
    const { tipo, estado, responsable, localidad, anio, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (tipo && tipo !== 'all') {
      where += ' AND o.tipo = ?';
      params.push(tipo);
    }
    if (estado && estado !== 'all') {
      where += ' AND o.estado = ?';
      params.push(estado);
    }
    if (responsable) {
      where += ' AND o.responsable LIKE ?';
      params.push(`%${responsable}%`);
    }
    if (localidad) {
      where += ' AND o.localidad LIKE ?';
      params.push(`%${localidad}%`);
    }
    if (anio) {
      where += ' AND o.anio = ?';
      params.push(Number(anio));
    }
    if (search) {
      where += ' AND (o.nombre LIKE ? OR o.ubicacion LIKE ? OR o.responsable LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM obras o ${where}`,
      params
    );
    const total = countResult[0].total;

    // Data
    const [obras] = await pool.query(
      `SELECT o.*, u.nombre as creado_por_nombre, u.apellido as creado_por_apellido
       FROM obras o
       LEFT JOIN usuarios u ON o.created_by = u.id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    res.json({
      obras,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error listando obras:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener obra por ID
app.get('/api/obras/:id', authenticateToken, async (req, res) => {
  try {
    const [obras] = await pool.query(
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

    // Datos específicos según tipo
    if (obra.tipo === 'pozo') {
      const [pozos] = await pool.query('SELECT * FROM pozos WHERE id = ?', [obra.id]);
      if (pozos.length > 0) obra.datos_pozo = pozos[0];
    } else if (obra.tipo === 'planta') {
      const [plantas] = await pool.query('SELECT * FROM plantas WHERE id = ?', [obra.id]);
      if (plantas.length > 0) obra.datos_planta = plantas[0];
    }

    // Archivos (incluir subido_por para control de permisos)
    const [archivos] = await pool.query(
      `SELECT a.id, a.nombre_original, a.nombre_guardado, a.mime_type, a.tamano, a.created_at, a.subido_por,
              u.nombre as subido_por_nombre, u.apellido as subido_por_apellido
       FROM archivos_obra a
       LEFT JOIN usuarios u ON a.subido_por = u.id
       WHERE a.obra_id = ? ORDER BY a.created_at DESC`,
      [obra.id]
    );
    obra.archivos = archivos;

    res.json({ obra });
  } catch (err) {
    console.error('Error obteniendo obra:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear obra (solo roles con permiso crearObra)
app.post('/api/obras', authenticateToken, loadUser, async (req, res) => {
  const permisos = getPermisos(req.userInfo.rol);
  if (!permisos.crearObra) {
    return res.status(403).json({ error: 'Tu rol no tiene permisos para crear obras' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      tipo, nombre, ubicacion, empresa, responsable, estado, anio,
      latitud, longitud, descripcion, porcentaje_avance, localidad,
      profundidad, caudal, tipo_bomba, contaminantes,
      tratamiento, capacidad, fuente,
    } = req.body;

    if (!tipo || !nombre || !ubicacion || !responsable || !estado) {
      return res.status(400).json({ error: 'Tipo, nombre, ubicación, responsable y estado son requeridos' });
    }

    const [insertResult] = await conn.query(
      `INSERT INTO obras (tipo, nombre, ubicacion, empresa, responsable, estado, anio, latitud, longitud, descripcion, porcentaje_avance, localidad, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tipo, nombre, ubicacion, empresa || null, responsable, estado, anio || null, latitud || null, longitud || null, descripcion || null, porcentaje_avance ?? 100, localidad || null, req.userInfo.id]
    );
    const id = insertResult.insertId;

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

    const [obra] = await pool.query('SELECT * FROM obras WHERE id = ?', [id]);

    auditLog(req.userInfo.id, 'CREAR_OBRA', 'obra', id, req.ip, { tipo, nombre });

    res.status(201).json({ obra: obra[0], id });
  } catch (err) {
    await conn.rollback();
    console.error('Error creando obra:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

// Actualizar obra (con chequeo de permisos)
app.put('/api/obras/:id', authenticateToken, loadUser, async (req, res) => {
  const permisos = getPermisos(req.userInfo.rol);
  if (!permisos.editarObra) {
    return res.status(403).json({ error: 'Tu rol no tiene permisos para editar obras' });
  }

  // Si solo puede editar las suyas, verificar created_by
  if (permisos.editarSoloSuyas) {
    const [check] = await pool.query('SELECT created_by FROM obras WHERE id = ?', [req.params.id]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Obra no encontrada' });
    }
    if (check[0].created_by !== req.userInfo.id) {
      return res.status(403).json({ error: 'Solo puedes editar obras que hayas creado' });
    }
  }

  const [existingRows] = await pool.query('SELECT * FROM obras WHERE id = ?', [req.params.id]);
  if (existingRows.length === 0) {
    return res.status(404).json({ error: 'Obra no encontrada' });
  }
  const existingObra = existingRows[0];

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

    // Obtener tipo
    const [obras] = await pool.query('SELECT tipo FROM obras WHERE id = ?', [req.params.id]);
    const tipo = obras[0]?.tipo;

    if (tipo === 'pozo') {
      await conn.query(
        'UPDATE pozos SET profundidad = ?, caudal = ?, tipo_bomba = ?, contaminantes = ? WHERE id = ?',
        [profundidad || null, caudal || null, tipo_bomba || null, contaminantes || null, req.params.id]
      );
    } else if (tipo === 'planta') {
      await conn.query(
        'UPDATE plantas SET tratamiento = ?, capacidad = ?, fuente = ? WHERE id = ?',
        [tratamiento || null, capacidad || null, fuente || null, req.params.id]
      );
    }

    await conn.commit();

    const [updated] = await pool.query('SELECT * FROM obras WHERE id = ?', [req.params.id]);

    const estadoLabels = {
      en_funcionamiento: 'En Funcionamiento',
      en_reparacion: 'En Reparación',
      fuera_de_servicio: 'Fuera de Servicio',
      en_construccion: 'En Construcción',
      en_estudio: 'En Estudio',
    };

    const cambios = [];
    const addCambio = (campo, anterior, nuevo, formatter = (value) => value) => {
      const previousValue = formatter(anterior);
      const nextValue = formatter(nuevo);
      if (previousValue !== nextValue) {
        cambios.push({ campo, anterior: previousValue, nuevo: nextValue });
      }
    };

    addCambio('nombre', existingObra.nombre, nombre);
    addCambio('ubicacion', existingObra.ubicacion, ubicacion);
    addCambio('empresa', existingObra.empresa, empresa || null);
    addCambio('responsable', existingObra.responsable, responsable);
    addCambio('estado', existingObra.estado, estado, (value) => estadoLabels[value] || value || '');
    addCambio('anio', existingObra.anio, anio || null, (value) => (value === null || value === undefined || value === '' ? '—' : String(value)));
    addCambio('latitud', existingObra.latitud, latitud || null, (value) => (value === null || value === undefined || value === '' ? '—' : String(value)));
    addCambio('longitud', existingObra.longitud, longitud || null, (value) => (value === null || value === undefined || value === '' ? '—' : String(value)));
    addCambio('descripción', existingObra.descripcion, descripcion || null, (value) => value || '—');
    addCambio('porcentaje_avance', existingObra.porcentaje_avance, porcentaje_avance ?? 100, (value) => `${value ?? '—'}%`);
    addCambio('localidad', existingObra.localidad, localidad || null, (value) => value || '—');

    auditLog(req.userInfo.id, 'ACTUALIZAR_OBRA', 'obra', req.params.id, req.ip, {
      antes: existingObra,
      despues: updated[0],
      cambios,
      resumen: {
        estado: estadoLabels[estado] || estado,
        porcentaje_avance: porcentaje_avance ?? 100,
      },
    });

    res.json({ obra: updated[0] });
  } catch (err) {
    await conn.rollback();
    console.error('Error actualizando obra:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

// Eliminar obra (solo roles con permiso eliminarObra)
app.delete('/api/obras/:id', authenticateToken, loadUser, async (req, res) => {
  const permisos = getPermisos(req.userInfo.rol);
  if (!permisos.eliminarObra) {
    return res.status(403).json({ error: 'Tu rol no tiene permisos para eliminar obras' });
  }

  try {
    const [obras] = await pool.query('SELECT id, nombre, tipo FROM obras WHERE id = ?', [req.params.id]);
    if (obras.length === 0) {
      return res.status(404).json({ error: 'Obra no encontrada' });
    }

    await pool.query('DELETE FROM obras WHERE id = ?', [req.params.id]);

    auditLog(req.userInfo.id, 'ELIMINAR_OBRA', 'obra', req.params.id, req.ip, { nombre: obras[0].nombre });

    res.json({ message: 'Obra eliminada correctamente', obra: obras[0] });
  } catch (err) {
    console.error('Error eliminando obra:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// ARCHIVOS ROUTES
// ═══════════════════════════════════════════════════════

// Subir archivo (todos los roles autenticados pueden subir)
app.post('/api/archivos/:obraId', authenticateToken, loadUser, upload.single('file'), async (req, res) => {
  try {
    const permisos = getPermisos(req.userInfo.rol);
    if (!permisos.subirArchivos) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Tu rol no tiene permisos para subir archivos' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const [obras] = await pool.query('SELECT id FROM obras WHERE id = ?', [req.params.obraId]);
    if (obras.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Obra no encontrada' });
    }

    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO archivos_obra (id, obra_id, nombre_original, nombre_guardado, mime_type, tamano, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.params.obraId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.userInfo.id]
    );

    const [archivo] = await pool.query(
      'SELECT id, nombre_original, nombre_guardado, mime_type, tamano, created_at FROM archivos_obra WHERE id = ?',
      [id]
    );

    res.status(201).json({ archivo: archivo[0] });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error subiendo archivo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar archivos de una obra
app.get('/api/archivos/:obraId', authenticateToken, async (req, res) => {
  try {
    const [archivos] = await pool.query(
      `SELECT a.id, a.nombre_original, a.nombre_guardado, a.mime_type, a.tamano,
              a.created_at, u.nombre as subido_por_nombre, u.apellido as subido_por_apellido
       FROM archivos_obra a
       LEFT JOIN usuarios u ON a.subido_por = u.id
       WHERE a.obra_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.obraId]
    );
    res.json({ archivos });
  } catch (err) {
    console.error('Error listando archivos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Descargar archivo
app.get('/api/archivos/download/:fileId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT nombre_original, nombre_guardado, mime_type FROM archivos_obra WHERE id = ?',
      [req.params.fileId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const file = rows[0];
    const filePath = path.join(uploadsDir, file.nombre_guardado);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.nombre_original}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error descargando archivo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar archivo (con chequeo de permisos)
app.delete('/api/archivos/:fileId', authenticateToken, loadUser, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre_guardado, nombre_original, subido_por FROM archivos_obra WHERE id = ?',
      [req.params.fileId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const file = rows[0];
    const permisos = getPermisos(req.userInfo.rol);

    if (!permisos.eliminarArchivos) {
      return res.status(403).json({ error: 'Tu rol no tiene permisos para eliminar archivos' });
    }

    // Si solo puede eliminar los suyos, verificar subido_por
    if (permisos.eliminarSoloSuyos && file.subido_por !== req.userInfo.id) {
      return res.status(403).json({ error: 'Solo puedes eliminar archivos que hayas subido' });
    }

    await pool.query('DELETE FROM archivos_obra WHERE id = ?', [req.params.fileId]);

    const filePath = path.join(uploadsDir, file.nombre_guardado);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    auditLog(req.userInfo.id, 'ELIMINAR_ARCHIVO', 'archivos_obra', req.params.fileId, req.ip, { nombre: file.nombre_original });

    res.json({ message: 'Archivo eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando archivo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// DASHBOARD ROUTES
// ═══════════════════════════════════════════════════════

app.get('/api/dashboard/stats', authenticateToken, async (_req, res) => {
  try {
    const [[totalResult], [statusResult], [tipoResult], [filesResult]] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM obras'),
      pool.query('SELECT estado, COUNT(*) as count FROM obras GROUP BY estado'),
      pool.query('SELECT tipo, COUNT(*) as count FROM obras GROUP BY tipo'),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(tamano), 0) as total_size FROM archivos_obra'),
    ]);

    const estadoCounts = { en_funcionamiento: 0, en_reparacion: 0, fuera_de_servicio: 0, en_construccion: 0 };
    statusResult.forEach(r => { estadoCounts[r.estado] = parseInt(r.count); });

    const tipoCounts = { pozo: 0, planta: 0 };
    tipoResult.forEach(r => { tipoCounts[r.tipo] = parseInt(r.count); });

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
  } catch (err) {
    console.error('Error en stats:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/dashboard/activity', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const [activity] = await pool.query(
      `SELECT a.id, a.titulo, a.contexto, a.entidad, a.entidad_id,
              a.fecha, u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ORDER BY a.fecha DESC
       LIMIT ?`,
      [Number(limit)]
    );
    res.json({ activity });
  } catch (err) {
    console.error('Error en activity:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/dashboard/en-construccion', authenticateToken, async (_req, res) => {
  try {
    const [obras] = await pool.query(
      `SELECT id, nombre, ubicacion, localidad, responsable, porcentaje_avance, empresa
       FROM obras WHERE estado = 'en_construccion' ORDER BY porcentaje_avance ASC`
    );
    res.json({ obras });
  } catch (err) {
    console.error('Error en en-construccion:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/dashboard/chart-data', authenticateToken, async (_req, res) => {
  try {
    const [[statusData], [tipoData], [monthlyData]] = await Promise.all([
      pool.query('SELECT estado, COUNT(*) as count FROM obras GROUP BY estado'),
      pool.query('SELECT tipo, COUNT(*) as count FROM obras GROUP BY tipo'),
      pool.query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as mes, COUNT(*) as count
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
  } catch (err) {
    console.error('Error en chart-data:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// USUARIOS ROUTES (solo roles con gestionarUsuarios)
// ═══════════════════════════════════════════════════════

function authorizeGestionUsuarios(req, res, next) {
  const permisos = getPermisos(req.userInfo.rol);
  if (!permisos.gestionarUsuarios) {
    return res.status(403).json({ error: 'Tu rol no tiene permisos para gestionar usuarios' });
  }
  next();
}

app.get('/api/usuarios', authenticateToken, loadUser, authorizeGestionUsuarios, async (req, res) => {
  try {
    const { search, rol, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (nombre LIKE ? OR apellido LIKE ? OR correo LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (rol) {
      where += ' AND rol = ?';
      params.push(rol);
    }

    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM usuarios ${where}`, params);
    const total = countResult[0].total;

    const [users] = await pool.query(
      `SELECT id, nombre, apellido, correo, rol, activo, created_at, updated_at
       FROM usuarios ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    res.json({
      usuarios: users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/usuarios/:id', authenticateToken, loadUser, authorizeGestionUsuarios, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, apellido, correo, rol, activo, created_at, updated_at FROM usuarios WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [obrasCount] = await pool.query('SELECT COUNT(*) as total FROM obras WHERE created_by = ?', [req.params.id]);

    res.json({
      usuario: { ...rows[0], obras_creadas: parseInt(obrasCount[0].total) },
    });
  } catch (err) {
    console.error('Error obteniendo usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.patch('/api/usuarios/:id/role', authenticateToken, loadUser, authorizeGestionUsuarios, async (req, res) => {
  try {
    const { rol } = req.body;
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido. Debe ser: ${ROLES_VALIDOS.join(', ')}` });
    }
    if (req.params.id === req.userInfo.id) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }

    const [result] = await pool.query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [user] = await pool.query(
      'SELECT id, nombre, apellido, correo, rol, activo FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    auditLog(req.userInfo.id, 'CAMBIAR_ROL', 'usuario', req.params.id, req.ip, { rol });

    res.json({ usuario: user[0], message: `Rol actualizado a "${rol}"` });
  } catch (err) {
    console.error('Error cambiando rol:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.patch('/api/usuarios/:id/toggle-active', authenticateToken, loadUser, authorizeGestionUsuarios, async (req, res) => {
  try {
    if (req.params.id === req.userInfo.id) {
      return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
    }

    const [result] = await pool.query('UPDATE usuarios SET activo = NOT activo WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [user] = await pool.query(
      'SELECT id, nombre, apellido, correo, rol, activo FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    const status = user[0].activo ? 'activado' : 'desactivado';
    auditLog(req.userInfo.id, 'TOGGLE_ACTIVO', 'usuario', req.params.id, req.ip, { status });

    res.json({ usuario: user[0], message: `Usuario ${status} correctamente` });
  } catch (err) {
    console.error('Error toggle-active:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// ERROR HANDLER
// ═══════════════════════════════════════════════════════

app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message);
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo excede el tamaño máximo de 10 MB' });
    }
    return res.status(400).json({ error: `Error de subida: ${err.message}` });
  }
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

// ═══════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════

app.listen(port, '0.0.0.0', () => {
  console.log(`\n✨ Recursos Hídricos SDE - Backend corriendo en http://localhost:${port}`);
  console.log(`📋 API: http://localhost:${port}/api`);
  console.log(`🗄️  DB: ${process.env.DB_NAME}\n`);
});
