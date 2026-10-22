import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { query } from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ─── Configurar Multer ──────────────────────────────
// Usar ruta relativa al proyecto, no al cwd
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
  'image/jpeg',
  'image/png',
  'image/webp',
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
      cb(new Error('Tipo de archivo no permitido. Se aceptan: PDF, imágenes, Word, Excel, CSV'));
    }
  },
});

router.use(authenticate);

// ─── Subir archivo a una obra ────────────────────────
router.post(
  '/:obraId',
  auditLog('SUBIR_ARCHIVO', 'archivos_obra'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }

      const obras = await query('SELECT id FROM obras WHERE id = ?', [req.params.obraId]);
      if (obras.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Obra no encontrada' });
      }

      const id = crypto.randomUUID();
      await query(
        `INSERT INTO archivos_obra (id, obra_id, nombre_original, nombre_guardado, mime_type, tamano, subido_por)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, req.params.obraId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user.id]
      );

      const [archivo] = await query(
        'SELECT id, nombre_original, nombre_guardado, mime_type, tamano, created_at FROM archivos_obra WHERE id = ?',
        [id]
      );

      res.status(201).json({ archivo });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
);

// ─── Listar archivos de una obra ─────────────────────
router.get('/:obraId', async (req, res, next) => {
  try {
    const archivos = await query(
      `SELECT a.id, a.nombre_original, a.nombre_guardado, a.mime_type, a.tamano,
              a.created_at, u.nombre as subido_por_nombre, u.apellido as subido_por_apellido
       FROM archivos_obra a
       LEFT JOIN usuarios u ON a.subido_por = u.id
       WHERE a.obra_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.obraId]
    );

    res.json({ archivos });
  } catch (error) {
    next(error);
  }
});

// ─── Descargar un archivo ────────────────────────────
router.get('/download/:fileId', async (req, res, next) => {
  try {
    const rows = await query(
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
  } catch (error) {
    next(error);
  }
});

// ─── Eliminar un archivo ─────────────────────────────
router.delete(
  '/:fileId',
  auditLog('ELIMINAR_ARCHIVO', 'archivos_obra'),
  async (req, res, next) => {
    try {
      const rows = await query(
        'SELECT id, nombre_guardado, nombre_original FROM archivos_obra WHERE id = ?',
        [req.params.fileId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }

      const file = rows[0];
      const filePath = path.join(uploadsDir, file.nombre_guardado);

      await query('DELETE FROM archivos_obra WHERE id = ?', [req.params.fileId]);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ message: 'Archivo eliminado correctamente', archivo: { id: file.id, nombre: file.nombre_original } });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Manejo de errores de Multer ─────────────────────
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo excede el tamaño máximo de 10 MB' });
    }
    return res.status(400).json({ error: `Error de subida: ${err.message}` });
  }
  if (err.message && err.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
