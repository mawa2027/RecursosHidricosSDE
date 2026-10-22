import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { pool, query } from './connection.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

async function seed() {
  try {
    console.log('🌱 Iniciando seed de datos...\n');

    // ─── Crear usuario administrador ─────────────────
    const adminPass = await bcrypt.hash('admin123', 12);
    await pool.query(
      `INSERT IGNORE INTO usuarios (nombre, apellido, correo, contrasena, rol)
       VALUES (?, ?, ?, ?, ?)`,
      ['Carlos', 'Administrador', 'admin@recursoshidricos.gob.ar', adminPass, 'administrador']
    );
    console.log('✅ Administrador: admin@recursoshidricos.gob.ar / admin123');

    // ─── Crear presidente ────────────────────────────
    const presPass = await bcrypt.hash('presidente123', 12);
    await pool.query(
      `INSERT IGNORE INTO usuarios (nombre, apellido, correo, contrasena, rol)
       VALUES (?, ?, ?, ?, ?)`,
      ['Roberto', 'Pérez', 'presidente@recursoshidricos.gob.ar', presPass, 'presidente']
    );
    console.log('✅ Presidente: presidente@recursoshidricos.gob.ar / presidente123');

    // ─── Crear inspector ─────────────────────────────
    const inspPass = await bcrypt.hash('inspector123', 12);
    await pool.query(
      `INSERT IGNORE INTO usuarios (nombre, apellido, correo, contrasena, rol)
       VALUES (?, ?, ?, ?, ?)`,
      ['María', 'López', 'inspector@recursoshidricos.gob.ar', inspPass, 'inspector']
    );
    console.log('✅ Inspector: inspector@recursoshidricos.gob.ar / inspector123');

    // ─── Crear usuarios de departamentos ─────────────
    const deptPass = await bcrypt.hash('depto123', 12);
    const deptos = [
      { nombre: 'Juan', apellido: 'García', correo: 'construccion@recursoshidricos.gob.ar', rol: 'dpto_construccion' },
      { nombre: 'Ana', apellido: 'Fernández', correo: 'estudios@recursoshidricos.gob.ar', rol: 'dpto_estudios' },
      { nombre: 'Pedro', apellido: 'Sánchez', correo: 'conservacion@recursoshidricos.gob.ar', rol: 'dpto_conservacion' },
    ];

    for (const d of deptos) {
      await pool.query(
        `INSERT IGNORE INTO usuarios (nombre, apellido, correo, contrasena, rol)
         VALUES (?, ?, ?, ?, ?)`,
        [d.nombre, d.apellido, d.correo, deptPass, d.rol]
      );
      console.log(`✅ ${d.rol}: ${d.correo} / depto123`);
    }

    // Obtener el ID del admin para created_by
    const [admins] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ?',
      ['admin@recursoshidricos.gob.ar']
    );
    const userId = admins[0]?.id;

    if (!userId) {
      console.log('⚠️ No se pudo obtener admin para crear obras de ejemplo');
      await pool.end();
      return;
    }

    // ─── Crear obras de ejemplo (plantas y pozos en Santiago del Estero) ─────
    const obras = [
      {
        tipo: 'planta',
        nombre: 'Planta Potabilizadora Capital',
        ubicacion: 'Santiago del Estero Capital',
        empresa: 'APRH',
        responsable: 'Ing. María García',
        estado: 'en_funcionamiento',
        anio: 2018,
        lat: -27.7834,
        lng: -64.2642,
        desc: 'Planta principal de potabilización que abastece la ciudad capital. Capacidad de 800 m³/h.',
        avance: 100,
        localidad: 'Capital',
        // Datos específicos planta
        tratamiento: 'Potabilización convencional',
        capacidad: '800 m³/h',
        fuente: 'Río Dulce',
      },
      {
        tipo: 'planta',
        nombre: 'Planta de Tratamiento La Banda',
        ubicacion: 'La Banda, Santiago del Estero',
        empresa: 'APRH',
        responsable: 'Ing. Carlos Pérez',
        estado: 'en_reparacion',
        anio: 2015,
        lat: -27.7350,
        lng: -64.2408,
        desc: 'Planta de tratamiento de aguas residuales. Actualmente en reparación de bombas principales.',
        avance: 100,
        localidad: 'La Banda',
        tratamiento: 'Tratamiento secundario',
        capacidad: '500 m³/h',
        fuente: 'Río Dulce',
      },
      {
        tipo: 'pozo',
        nombre: 'Pozo Nº 14 - Añatuya',
        ubicacion: 'Añatuya, General Taboada',
        empresa: 'APRH',
        responsable: 'Ing. Roberto Sánchez',
        estado: 'en_funcionamiento',
        anio: 2020,
        lat: -28.4614,
        lng: -62.8356,
        desc: 'Pozo de extracción de agua subterránea para abastecimiento de la localidad de Añatuya.',
        avance: 100,
        localidad: 'Añatuya',
        // Datos específicos pozo
        profundidad: 120,
        caudal: 45.5,
        tipo_bomba: 'Bomba sumergible centrífuga',
        contaminantes: 'Arsénico: 0.01 mg/L (dentro de norma)',
      },
      {
        tipo: 'pozo',
        nombre: 'Pozo Nº 22 - Termas de Río Hondo',
        ubicacion: 'Termas de Río Hondo, Río Hondo',
        empresa: 'APRH',
        responsable: 'Ing. Ana Fernández',
        estado: 'fuera_de_servicio',
        anio: 2012,
        lat: -27.4935,
        lng: -64.8583,
        desc: 'Pozo fuera de servicio. Pendiente reemplazo de bomba y análisis de contaminantes.',
        avance: 100,
        localidad: 'Termas de Río Hondo',
        profundidad: 85,
        caudal: 0,
        tipo_bomba: 'Bomba sumergible (dañada)',
        contaminantes: 'Pendiente análisis',
      },
      {
        tipo: 'planta',
        nombre: 'Planta Potabilizadora Fernández',
        ubicacion: 'Fernández, Robles',
        empresa: 'Constructora del Norte SRL',
        responsable: 'Ing. Juan Herrera',
        estado: 'en_construccion',
        anio: 2025,
        lat: -27.9237,
        lng: -63.8953,
        desc: 'Nueva planta potabilizadora en construcción para abastecer la localidad de Fernández y zonas aledañas.',
        avance: 65,
        localidad: 'Fernández',
        tratamiento: 'Potabilización por ósmosis inversa',
        capacidad: '300 m³/h (proyectada)',
        fuente: 'Acuífero subterráneo',
      },
    ];

    for (const obra of obras) {
      await pool.query(
        `INSERT INTO obras (tipo, nombre, ubicacion, empresa, responsable, estado, anio, latitud, longitud, descripcion, porcentaje_avance, localidad, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [obra.tipo, obra.nombre, obra.ubicacion, obra.empresa, obra.responsable, obra.estado, obra.anio, obra.lat, obra.lng, obra.desc, obra.avance, obra.localidad, userId]
      );
      const [inserted] = await pool.query('SELECT LAST_INSERT_ID() AS id');
      const obraId = inserted[0].id;

      // Insertar datos específicos según tipo
      if (obra.tipo === 'pozo') {
        await pool.query(
          `INSERT INTO pozos (id, profundidad, caudal, tipo_bomba, contaminantes) VALUES (?, ?, ?, ?, ?)`,
          [obraId, obra.profundidad, obra.caudal, obra.tipo_bomba, obra.contaminantes]
        );
      } else if (obra.tipo === 'planta') {
        await pool.query(
          `INSERT INTO plantas (id, tratamiento, capacidad, fuente) VALUES (?, ?, ?, ?)`,
          [obraId, obra.tratamiento, obra.capacidad, obra.fuente]
        );
      }

      console.log(`  🏗️  ${obra.tipo === 'pozo' ? '💧' : '�'} ${obra.nombre} (${obra.estado})`);
    }

    console.log('\n🎉 Seed completado!\n');
    console.log('═══════════════════════════════════════');
    console.log('  Credenciales de acceso:');
    console.log('  admin@recursoshidricos.gob.ar / admin123');
    console.log('  presidente@recursoshidricos.gob.ar / presidente123');
    console.log('  inspector@recursoshidricos.gob.ar / inspector123');
    console.log('  construccion@recursoshidricos.gob.ar / depto123');
    console.log('  estudios@recursoshidricos.gob.ar / depto123');
    console.log('  conservacion@recursoshidricos.gob.ar / depto123');
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error en el seed:', error.message);
  } finally {
    await pool.end();
  }
}

seed();

