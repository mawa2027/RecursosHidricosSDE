import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const DB_NAME = process.env.DB_NAME || 'recursos_hidricos_sde';

async function initDatabase() {
  // 1. Conectar sin DB para crearla si no existe
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('✅ Conectado a MySQL');

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Base de datos "${DB_NAME}" verificada/creada`);

    await connection.query(`USE \`${DB_NAME}\``);

    // ─── Tabla de usuarios (según diagrama ER) ───────
    // Campos: ID_usuario, nombre, apellido, correo, contraseña, rol
    // Roles del TP: administrador, presidente, inspector, dpto_construccion, dpto_estudios, dpto_conservacion
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nombre        VARCHAR(255) NOT NULL,
        apellido      VARCHAR(255) NOT NULL,
        correo        VARCHAR(255) UNIQUE NOT NULL,
        contrasena    VARCHAR(255) NOT NULL,
        rol           ENUM('administrador', 'presidente', 'inspector', 'dpto_construccion', 'dpto_estudios', 'dpto_conservacion') NOT NULL DEFAULT 'inspector',
        activo        TINYINT(1) DEFAULT 1,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Tabla "usuarios" creada');

    // ─── Tabla de obras (entidad principal del ER) ───
    // Campos: ID_obra, tipo (pozo/planta), ubicación, empresa, responsable, estado, año
    // + campos extra: latitud, longitud, descripción, porcentaje_avance
    await connection.query(`
      CREATE TABLE IF NOT EXISTS obras (
        id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tipo                ENUM('pozo', 'planta') NOT NULL,
        nombre              VARCHAR(255) NOT NULL,
        ubicacion           VARCHAR(500) NOT NULL,
        empresa             VARCHAR(255),
        responsable         VARCHAR(255) NOT NULL,
        estado              ENUM('en_funcionamiento', 'en_reparacion', 'fuera_de_servicio', 'en_construccion') NOT NULL DEFAULT 'en_funcionamiento',
        anio                YEAR,
        latitud             DECIMAL(10, 6),
        longitud            DECIMAL(10, 6),
        descripcion         TEXT,
        porcentaje_avance   INT DEFAULT 100,
        localidad           VARCHAR(255),
        created_by          INT UNSIGNED,
        created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Tabla "obras" creada');

    // ─── Tabla de pozos (hereda de obra, datos específicos) ──
    // Campos ER: profundidad, caudal, tipo_bomba, contaminantes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pozos (
        id              INT UNSIGNED PRIMARY KEY,
        profundidad     DECIMAL(10, 2),
        caudal          DECIMAL(10, 2),
        tipo_bomba      VARCHAR(255),
        contaminantes   TEXT,
        FOREIGN KEY (id) REFERENCES obras(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Tabla "pozos" creada');

    // ─── Tabla de plantas (hereda de obra, datos específicos) ──
    // Campos ER: tratamiento, capacidad, fuente
    await connection.query(`
      CREATE TABLE IF NOT EXISTS plantas (
        id              INT UNSIGNED PRIMARY KEY,
        tratamiento     VARCHAR(255),
        capacidad       VARCHAR(255),
        fuente          VARCHAR(255),
        FOREIGN KEY (id) REFERENCES obras(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Tabla "plantas" creada');

    // ─── Tabla de archivos de obra (expedientes, certificados, fotos) ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS archivos_obra (
        id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        obra_id         INT UNSIGNED NOT NULL,
        nombre_original VARCHAR(500) NOT NULL,
        nombre_guardado VARCHAR(500) NOT NULL,
        mime_type       VARCHAR(100),
        tamano          BIGINT,
        subido_por      INT UNSIGNED,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE CASCADE,
        FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Tabla "archivos_obra" creada');

    // ─── Tabla de auditoría (según diagrama ER) ──────
    // Campos ER: ID_actividad, título, contexto, fecha
    // + user_id, entidad, entidad_id, ip para trazabilidad completa
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_id    INT UNSIGNED,
        titulo        VARCHAR(255) NOT NULL,
        contexto      TEXT,
        entidad       VARCHAR(100),
        entidad_id    VARCHAR(64),
        ip_address    VARCHAR(45),
        fecha         DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Tabla "auditoria" creada');

    // ─── Índices ─────────────────────────────────────
    const indexes = [
      'CREATE INDEX idx_obras_tipo ON obras(tipo)',
      'CREATE INDEX idx_obras_estado ON obras(estado)',
      'CREATE INDEX idx_obras_localidad ON obras(localidad)',
      'CREATE INDEX idx_obras_created_by ON obras(created_by)',
      'CREATE INDEX idx_archivos_obra_id ON archivos_obra(obra_id)',
      'CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id)',
      'CREATE INDEX idx_auditoria_entidad ON auditoria(entidad, entidad_id)',
      'CREATE INDEX idx_usuarios_correo ON usuarios(correo)',
    ];

    for (const idx of indexes) {
      try {
        await connection.query(idx);
      } catch (e) {
        // Ignorar si el índice ya existe (error 1061)
        if (e.errno !== 1061) throw e;
      }
    }
    console.log('✅ Índices creados');

    console.log('\n🎉 Base de datos inicializada correctamente!\n');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();

