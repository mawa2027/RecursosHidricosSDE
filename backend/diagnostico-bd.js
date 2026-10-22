/**
 * Script de Diagnóstico - Base de Datos MySQL
 * Uso: node diagnostico-bd.js
 * 
 * Este script verifica:
 * 1. Conexión a MySQL
 * 2. Existencia de la base de datos
 * 3. Tablas creadas
 * 4. Credenciales correctas
 * 5. Estado de la conexión
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function diagnostico() {
  log('\n═════════════════════════════════════════════════════════', 'cyan');
  log('  DIAGNÓSTICO DE BASE DE DATOS - Recursos Hídricos SDE', 'cyan');
  log('═════════════════════════════════════════════════════════\n', 'cyan');

  // 1. Verificar variables de entorno
  log('📋 VARIABLES DE ENTORNO:', 'blue');
  log(`   DB_HOST: ${process.env.DB_HOST || 'NO CONFIGURADO'}`);
  log(`   DB_PORT: ${process.env.DB_PORT || 'NO CONFIGURADO'}`);
  log(`   DB_NAME: ${process.env.DB_NAME || 'NO CONFIGURADO'}`);
  log(`   DB_USER: ${process.env.DB_USER || 'NO CONFIGURADO'}`);
  log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '✓ CONFIGURADA' : '❌ NO CONFIGURADA'}`);

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recursos_hidricos_sde',
  };

  log('\n📡 INTENTANDO CONECTAR A MYSQL...', 'yellow');

  try {
    // Paso 1: Conectar sin base de datos
    log('\n1️⃣  Conectando sin especificar base de datos...', 'blue');
    const connWithoutDB = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });
    log('   ✅ Conexión exitosa a MySQL', 'green');

    // Paso 2: Verificar si la BD existe
    log('\n2️⃣  Verificando si existe la base de datos...', 'blue');
    const [dbs] = await connWithoutDB.query(`SHOW DATABASES LIKE '${config.database}'`);
    
    if (dbs.length > 0) {
      log(`   ✅ Base de datos "${config.database}" EXISTE`, 'green');
    } else {
      log(`   ❌ Base de datos "${config.database}" NO EXISTE`, 'red');
      log('   ⚠️  Necesitas crear la base de datos primero', 'yellow');
    }

    // Paso 3: Intentar conectar con la BD
    log('\n3️⃣  Conectando con la base de datos...', 'blue');
    try {
      const connWithDB = await mysql.createConnection(config);
      log(`   ✅ Conectado a "${config.database}"`, 'green');

      // Paso 4: Listar tablas
      log('\n4️⃣  Verificando tablas en la base de datos...', 'blue');
      const [tables] = await connWithDB.query('SHOW TABLES');
      
      if (tables.length === 0) {
        log('   ⚠️  NO HAY TABLAS CREADAS', 'yellow');
        log('   💡 Necesitas ejecutar: npm run db:init', 'yellow');
      } else {
        log(`   ✅ Se encontraron ${tables.length} tablas:`, 'green');
        tables.forEach((row, idx) => {
          const tableName = Object.values(row)[0];
          log(`      ${idx + 1}. ${tableName}`);
        });

        // Paso 5: Verificar usuarios
        log('\n5️⃣  Verificando tabla usuarios...', 'blue');
        try {
          const [users] = await connWithDB.query('SELECT COUNT(*) as total FROM usuarios');
          log(`   ✅ Tabla usuarios OK - ${users[0].total} usuarios registrados`, 'green');
        } catch (err) {
          log(`   ❌ Error al consultar usuarios: ${err.message}`, 'red');
        }
      }

      await connWithDB.end();
    } catch (err) {
      log(`   ❌ Error al conectar con BD: ${err.message}`, 'red');
      if (err.code === 'ER_BAD_DB_ERROR') {
        log('   💡 La base de datos no existe. Ejecuta: npm run db:init', 'yellow');
      }
    }

    await connWithoutDB.end();

  } catch (err) {
    log(`\n❌ ERROR DE CONEXIÓN A MYSQL:`, 'red');
    log(`   ${err.message}`, 'red');
    
    if (err.code === 'ECONNREFUSED') {
      log('\n🔴 MySQL NO ESTÁ EJECUTÁNDOSE', 'red');
      log('   Windows: Abre Services.msc y busca "MySQL"', 'yellow');
      log('   O ejecuta: "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld"', 'yellow');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      log('\n🔴 CREDENCIALES INCORRECTAS', 'red');
      log(`   Usuario: ${config.user}`, 'yellow');
      log(`   Contraseña: Verifica que sea correcta en .env`, 'yellow');
    } else if (err.code === 'ENOTFOUND') {
      log('\n🔴 HOST NO ENCONTRADO', 'red');
      log(`   Host: ${config.host}`, 'yellow');
      log('   Verifica que sea correcto en .env', 'yellow');
    }
  }

  log('\n═════════════════════════════════════════════════════════\n', 'cyan');
  log('PRÓXIMOS PASOS:', 'blue');
  log('1. Si MySQL no está corriendo: Abre la consola MySQL', 'yellow');
  log('2. Si falta la BD: Ejecuta en el backend: npm run db:init', 'yellow');
  log('3. Si falta data: Ejecuta en el backend: npm run db:seed', 'yellow');
  log('4. Para iniciar: npm run dev', 'yellow');
  log('\n═════════════════════════════════════════════════════════\n', 'cyan');
}

diagnostico().catch(err => {
  log(`\n❌ Error fatal: ${err.message}`, 'red');
  process.exit(1);
});
