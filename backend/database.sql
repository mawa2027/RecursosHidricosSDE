-- ═══════════════════════════════════════════════════════════════
-- Recursos Hídricos SDE - Script de Base de Datos
-- Generado para MySQL 8.0+
-- ═══════════════════════════════════════════════════════════════

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS `recursos_hidricos_sde`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `recursos_hidricos_sde`;

-- ═══════════════════════════════════════════════════════════════
-- TABLA: usuarios
-- Diagrama ER: ID_usuario, nombre, apellido, correo, contraseña, rol
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nombre`      VARCHAR(255) NOT NULL,
  `apellido`    VARCHAR(255) NOT NULL,
  `correo`      VARCHAR(255) UNIQUE NOT NULL,
  `contrasena`  VARCHAR(255) NOT NULL,
  `rol`         ENUM('administrador','presidente','inspector','dpto_construccion','dpto_estudios','dpto_conservacion') NOT NULL DEFAULT 'inspector',
  `activo`      TINYINT(1) DEFAULT 1,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════
-- TABLA: obras (entidad principal del diagrama ER)
-- Diagrama ER: ID_obra, tipo, ubicación, empresa, responsable, estado, año
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `obras` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tipo`                ENUM('pozo','planta') NOT NULL,
  `nombre`              VARCHAR(255) NOT NULL,
  `ubicacion`           VARCHAR(500) NOT NULL,
  `empresa`             VARCHAR(255),
  `responsable`         VARCHAR(255) NOT NULL,
  `estado`              ENUM('en_funcionamiento','en_reparacion','fuera_de_servicio','en_construccion') NOT NULL DEFAULT 'en_funcionamiento',
  `anio`                YEAR,
  `latitud`             DECIMAL(10,6),
  `longitud`            DECIMAL(10,6),
  `descripcion`         TEXT,
  `porcentaje_avance`   INT DEFAULT 100,
  `localidad`           VARCHAR(255),
  `created_by`          INT UNSIGNED,
  `created_at`          DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════
-- TABLA: pozos (hereda de obra — relación "Es" del diagrama ER)
-- Diagrama ER: profundidad, caudal, tipo_bomba, contaminantes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `pozos` (
  `id`              INT UNSIGNED PRIMARY KEY,
  `profundidad`     DECIMAL(10,2),
  `caudal`          DECIMAL(10,2),
  `tipo_bomba`      VARCHAR(255),
  `contaminantes`   TEXT,
  FOREIGN KEY (`id`) REFERENCES `obras`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════
-- TABLA: plantas (hereda de obra — relación "Es" del diagrama ER)
-- Diagrama ER: tratamiento, capacidad, fuente
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `plantas` (
  `id`              INT UNSIGNED PRIMARY KEY,
  `tratamiento`     VARCHAR(255),
  `capacidad`       VARCHAR(255),
  `fuente`          VARCHAR(255),
  FOREIGN KEY (`id`) REFERENCES `obras`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════
-- TABLA: archivos_obra (expedientes, certificados, fotos)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `archivos_obra` (
  `id`              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `obra_id`         INT UNSIGNED NOT NULL,
  `nombre_original` VARCHAR(500) NOT NULL,
  `nombre_guardado` VARCHAR(500) NOT NULL,
  `mime_type`       VARCHAR(100),
  `tamano`          BIGINT,
  `subido_por`      INT UNSIGNED,
  `created_at`      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subido_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════
-- TABLA: auditoria (según diagrama ER)
-- Diagrama ER: ID_actividad, título, contexto, fecha
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `auditoria` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `usuario_id`    INT UNSIGNED,
  `titulo`        VARCHAR(255) NOT NULL,
  `contexto`      TEXT,
  `entidad`       VARCHAR(100),
  `entidad_id`    VARCHAR(64),
  `ip_address`    VARCHAR(45),
  `fecha`         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_obras_tipo ON obras(tipo);
CREATE INDEX idx_obras_estado ON obras(estado);
CREATE INDEX idx_obras_localidad ON obras(localidad);
CREATE INDEX idx_obras_created_by ON obras(created_by);
CREATE INDEX idx_archivos_obra_id ON archivos_obra(obra_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_entidad ON auditoria(entidad, entidad_id);
CREATE INDEX idx_usuarios_correo ON usuarios(correo);

-- ═══════════════════════════════════════════════════════════════
-- DATOS INICIALES (SEED)
-- ═══════════════════════════════════════════════════════════════

-- Contraseñas hasheadas con bcrypt (12 rounds):
--   admin123      → $2b$12$LJ3m4ys8Lg8RUH8FEwJX8uQZPB6VH3C0vXvKpFJnGqY7dN5qG8Wgq
--   presidente123 → (se genera al ejecutar seed.js)
--   inspector123  → (se genera al ejecutar seed.js)
--   depto123      → (se genera al ejecutar seed.js)
--
-- NOTA: Las contraseñas hasheadas son únicas por ejecución.
-- Para insertar usuarios con contraseñas funcionales, ejecutar:
--   cd backend && node src/database/seed.js
--
-- Si querés datos de ejemplo SIN el backend, usá estos INSERT
-- (pero las contraseñas no funcionarán para login real):

INSERT INTO `usuarios` (`nombre`, `apellido`, `correo`, `contrasena`, `rol`) VALUES
  ('Carlos',  'Administrador', 'admin@recursoshidricos.gob.ar',        '$2b$12$N0uSe2U3nKzyzpZocDweM.5VUHhiKSO.7qI//.EWUnjgEGNTCMkka', 'administrador'),
  ('Roberto', 'Pérez',         'presidente@recursoshidricos.gob.ar',   '$2b$12$DEk/jCfQn.zkDsioi8.YKebLoGIO6qTUJsBsJi5XNIsRswNwaCq2K', 'presidente'),
  ('María',   'López',         'inspector@recursoshidricos.gob.ar',    '$2b$12$bNeeXrwS6Ibp8DSrMX35neWoAq5lntsCQhLvsy/nP3ktaAhh7bOIC', 'inspector'),
  ('Juan',    'García',        'construccion@recursoshidricos.gob.ar',  '$2b$12$aRRvsRBxsbxt.FLYj9KtGurkeifgSMAHSL41RAPU/sGzj3AKZV9P6', 'dpto_construccion'),
  ('Ana',     'Fernández',     'estudios@recursoshidricos.gob.ar',     '$2b$12$aRRvsRBxsbxt.FLYj9KtGurkeifgSMAHSL41RAPU/sGzj3AKZV9P6', 'dpto_estudios'),
  ('Pedro',   'Sánchez',       'conservacion@recursoshidricos.gob.ar', '$2b$12$aRRvsRBxsbxt.FLYj9KtGurkeifgSMAHSL41RAPU/sGzj3AKZV9P6', 'dpto_conservacion');

-- Obtener el ID del admin para created_by
SET @admin_id = (SELECT `id` FROM `usuarios` WHERE `correo` = 'admin@recursoshidricos.gob.ar' LIMIT 1);

-- ─── Obras de ejemplo ────────────────────────────────
-- Planta 1: Potabilizadora Capital (en funcionamiento)
INSERT INTO `obras` (`tipo`, `nombre`, `ubicacion`, `empresa`, `responsable`, `estado`, `anio`, `latitud`, `longitud`, `descripcion`, `porcentaje_avance`, `localidad`, `created_by`) VALUES
  ('planta', 'Planta Potabilizadora Capital', 'Santiago del Estero Capital', 'APRH', 'Ing. María García', 'en_funcionamiento', 2018, -27.783400, -64.264200, 'Planta principal de potabilización que abastece la ciudad capital. Capacidad de 800 m³/h.', 100, 'Capital', @admin_id);
SET @obra1 = LAST_INSERT_ID();
INSERT INTO `plantas` (`id`, `tratamiento`, `capacidad`, `fuente`) VALUES
  (@obra1, 'Potabilización convencional', '800 m³/h', 'Río Dulce');

-- Planta 2: Tratamiento La Banda (en reparación)
INSERT INTO `obras` (`tipo`, `nombre`, `ubicacion`, `empresa`, `responsable`, `estado`, `anio`, `latitud`, `longitud`, `descripcion`, `porcentaje_avance`, `localidad`, `created_by`) VALUES
  ('planta', 'Planta de Tratamiento La Banda', 'La Banda, Santiago del Estero', 'APRH', 'Ing. Carlos Pérez', 'en_reparacion', 2015, -27.735000, -64.240800, 'Planta de tratamiento de aguas residuales. Actualmente en reparación de bombas principales.', 100, 'La Banda', @admin_id);
SET @obra2 = LAST_INSERT_ID();
INSERT INTO `plantas` (`id`, `tratamiento`, `capacidad`, `fuente`) VALUES
  (@obra2, 'Tratamiento secundario', '500 m³/h', 'Río Dulce');

-- Pozo 1: Nº 14 Añatuya (en funcionamiento)
INSERT INTO `obras` (`tipo`, `nombre`, `ubicacion`, `empresa`, `responsable`, `estado`, `anio`, `latitud`, `longitud`, `descripcion`, `porcentaje_avance`, `localidad`, `created_by`) VALUES
  ('pozo', 'Pozo Nº 14 - Añatuya', 'Añatuya, General Taboada', 'APRH', 'Ing. Roberto Sánchez', 'en_funcionamiento', 2020, -28.461400, -62.835600, 'Pozo de extracción de agua subterránea para abastecimiento de la localidad de Añatuya.', 100, 'Añatuya', @admin_id);
SET @obra3 = LAST_INSERT_ID();
INSERT INTO `pozos` (`id`, `profundidad`, `caudal`, `tipo_bomba`, `contaminantes`) VALUES
  (@obra3, 120.00, 45.50, 'Bomba sumergible centrífuga', 'Arsénico: 0.01 mg/L (dentro de norma)');

-- Pozo 2: Nº 22 Termas de Río Hondo (fuera de servicio)
INSERT INTO `obras` (`tipo`, `nombre`, `ubicacion`, `empresa`, `responsable`, `estado`, `anio`, `latitud`, `longitud`, `descripcion`, `porcentaje_avance`, `localidad`, `created_by`) VALUES
  ('pozo', 'Pozo Nº 22 - Termas de Río Hondo', 'Termas de Río Hondo, Río Hondo', 'APRH', 'Ing. Ana Fernández', 'fuera_de_servicio', 2012, -27.493500, -64.858300, 'Pozo fuera de servicio. Pendiente reemplazo de bomba y análisis de contaminantes.', 100, 'Termas de Río Hondo', @admin_id);
SET @obra4 = LAST_INSERT_ID();
INSERT INTO `pozos` (`id`, `profundidad`, `caudal`, `tipo_bomba`, `contaminantes`) VALUES
  (@obra4, 85.00, 0.00, 'Bomba sumergible (dañada)', 'Pendiente análisis');

-- Planta 3: Potabilizadora Fernández (en construcción, 65%)
INSERT INTO `obras` (`tipo`, `nombre`, `ubicacion`, `empresa`, `responsable`, `estado`, `anio`, `latitud`, `longitud`, `descripcion`, `porcentaje_avance`, `localidad`, `created_by`) VALUES
  ('planta', 'Planta Potabilizadora Fernández', 'Fernández, Robles', 'Constructora del Norte SRL', 'Ing. Juan Herrera', 'en_construccion', 2025, -27.923700, -63.895300, 'Nueva planta potabilizadora en construcción para abastecer la localidad de Fernández y zonas aledañas.', 65, 'Fernández', @admin_id);
SET @obra5 = LAST_INSERT_ID();
INSERT INTO `plantas` (`id`, `tratamiento`, `capacidad`, `fuente`) VALUES
  (@obra5, 'Potabilización por ósmosis inversa', '300 m³/h (proyectada)', 'Acuífero subterráneo');

-- ═══════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ═══════════════════════════════════════════════════════════════
-- Para que el login funcione con contraseñas reales, ejecutar:
--   cd backend && node src/database/seed.js
--
-- Credenciales (después del seed):
--   admin@recursoshidricos.gob.ar / admin123
--   presidente@recursoshidricos.gob.ar / presidente123
--   inspector@recursoshidricos.gob.ar / inspector123
--   construccion@recursoshidricos.gob.ar / depto123
--   estudios@recursoshidricos.gob.ar / depto123
--   conservacion@recursoshidricos.gob.ar / depto123
-- ═══════════════════════════════════════════════════════════════
