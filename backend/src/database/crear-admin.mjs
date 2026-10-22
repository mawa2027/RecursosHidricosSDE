// Crea (o actualiza) el usuario administrador inicial.
// Uso (dentro del contenedor del backend):
//   ADMIN_CORREO=correo@ejemplo.com ADMIN_PASSWORD='clave-larga' node src/database/crear-admin.mjs
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const correo = process.env.ADMIN_CORREO;
const clave = process.env.ADMIN_PASSWORD;

if (!correo || !clave || clave.length < 12) {
  console.error('❌ Definí ADMIN_CORREO y ADMIN_PASSWORD (mínimo 12 caracteres).');
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'recursos_hidricos_sde',
});

try {
  const hash = await bcrypt.hash(clave, 12);
  const [rows] = await conn.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);

  if (rows.length > 0) {
    await conn.query(
      "UPDATE usuarios SET rol = 'administrador', contrasena = ?, activo = 1 WHERE correo = ?",
      [hash, correo]
    );
    console.log(`✅ Usuario existente actualizado como administrador: ${correo}`);
  } else {
    await conn.query(
      "INSERT INTO usuarios (nombre, apellido, correo, contrasena, rol) VALUES ('Administrador', 'Sistema', ?, ?, 'administrador')",
      [correo, hash]
    );
    console.log(`✅ Administrador creado: ${correo}`);
  }
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
} finally {
  await conn.end();
}
