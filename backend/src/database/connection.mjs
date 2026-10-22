import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar .env explícitamente — garantiza que las variables estén disponibles
// incluso si este módulo se importa antes que index.js configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'recursos_hidricos_sde',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});


/**
 * Helper: ejecuta una query y devuelve rows directamente.
 * MySQL2 devuelve [rows, fields] — aquí solo devolvemos rows.
 */
export const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};
