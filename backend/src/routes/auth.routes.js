import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const ROLES_VALIDOS = ['administrador', 'presidente', 'inspector', 'dpto_construccion', 'dpto_estudios', 'dpto_conservacion'];

// ─── Registro (solo admin puede crear usuarios según CU-LOGIN) ───
router.post(
  '/register',
  authenticate,
  validate({
    nombre: { required: true, minLength: 2, maxLength: 255, label: 'Nombre' },
    apellido: { required: true, minLength: 2, maxLength: 255, label: 'Apellido' },
    correo: { required: true, email: true, label: 'Correo' },
    contrasena: { required: true, minLength: 6, label: 'Contraseña' },
    rol: { required: true, enum: ROLES_VALIDOS, label: 'Rol' },
  }),
  async (req, res, next) => {
    try {
      // Solo admin puede crear usuarios
      if (req.user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo el administrador puede crear usuarios' });
      }

      const { nombre, apellido, correo, contrasena, rol } = req.body;

      // Verificar si el correo ya existe
      const existing = await query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }

      const hashedPassword = await bcrypt.hash(contrasena, 12);

      await query(
        `INSERT INTO usuarios (nombre, apellido, correo, contrasena, rol)
         VALUES (?, ?, ?, ?, ?)`,
        [nombre, apellido, correo, hashedPassword, rol]
      );

      const [user] = await query(
        'SELECT id, nombre, apellido, correo, rol, created_at FROM usuarios WHERE correo = ?',
        [correo]
      );

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Login ───────────────────────────────────────────
router.post(
  '/login',
  validate({
    correo: { required: true, email: true, label: 'Correo' },
    contrasena: { required: true, label: 'Contraseña' },
  }),
  async (req, res, next) => {
    try {
      const { correo, contrasena } = req.body;

      const rows = await query(
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
        process.env.JWT_SECRET,
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
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Obtener perfil actual ───────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ─── Recuperar contraseña (admin resetea) ────────────
router.post(
  '/reset-password',
  authenticate,
  validate({
    usuario_id: { required: true, label: 'ID de usuario' },
    nueva_contrasena: { required: true, minLength: 6, label: 'Nueva contraseña' },
  }),
  async (req, res, next) => {
    try {
      if (req.user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo el administrador puede restablecer contraseñas' });
      }

      const { usuario_id, nueva_contrasena } = req.body;

      const users = await query('SELECT id FROM usuarios WHERE id = ?', [usuario_id]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const hashedPassword = await bcrypt.hash(nueva_contrasena, 12);
      await query('UPDATE usuarios SET contrasena = ? WHERE id = ?', [hashedPassword, usuario_id]);

      res.json({ message: 'Contraseña restablecida correctamente' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

