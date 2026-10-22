import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ─── Cargar .env desde el directorio del proyecto (no depende del cwd) ───
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import obraRoutes from './routes/obra.routes.js';
import fileRoutes from './routes/file.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import userRoutes from './routes/user.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { pool } from './database/connection.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Seguridad ───────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
});
app.use('/api/', limiter);

// ─── Middlewares ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Servir archivos subidos
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ─── Rutas ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/obras', obraRoutes);
app.use('/api/archivos', fileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', userRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'MySQL connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// ─── Ruta raíz informativa ───────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'Recursos Hídricos SDE - API',
    version: '1.0.0',
    docs: '/api/health',
    endpoints: ['/api/auth', '/api/obras', '/api/archivos', '/api/dashboard', '/api/usuarios'],
  });
});

// ─── Error Handler ───────────────────────────────────
app.use(errorHandler);

// ─── Capturar errores no manejados para que no crashee el servidor ───
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// ─── Iniciar servidor ────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌊 Recursos Hídricos SDE - Backend`);
  console.log(`📡 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 API disponible en http://localhost:${PORT}/api`);
  console.log(`🗄️  Base de datos: MySQL`);
  console.log(`📂 .env cargado desde: ${envPath}\n`);
});
