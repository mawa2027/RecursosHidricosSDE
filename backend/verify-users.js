#!/usr/bin/env node
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '46141305',
      database: 'recursos_hidricos_sde',
    });

    const conn = await pool.getConnection();

    // 1. Ver estructura
    const [columns] = await conn.query('DESCRIBE usuarios');
    console.log('\n📋 ESTRUCTURA DE TABLA usuarios:');
    columns.forEach(c => console.log(`   ${c.Field}: ${c.Type}`));

    // 2. Contar usuarios
    const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`\n👥 TOTAL DE USUARIOS: ${count}\n`);

    // 3. Listar usuarios
    const [users] = await conn.query('SELECT id, nombre, correo, rol FROM usuarios');
    if (users.length === 0) {
      console.log('❌ NO HAY USUARIOS EN LA BD\n');
    } else {
      console.log('USUARIOS:');
      users.forEach(u => console.log(`   - ${u.correo} (${u.nombre}) - Rol: ${u.rol}`));
      console.log('');
    }

    // 4. Test login específico
    console.log('🧪 PROBANDO LOGIN:');
    const [rows] = await conn.query(
      'SELECT id, nombre, correo, contrasena, rol FROM usuarios WHERE correo = ?',
      ['admin@recursoshidricos.gob.ar']
    );

    if (rows.length === 0) {
      console.log('❌ Usuario admin@recursoshidricos.gob.ar NO EXISTE');
      console.log('\n💡 SOLUCIÓN: Ejecuta en backend: npm run db:init');
    } else {
      const user = rows[0];
      console.log(`✅ Usuario encontrado: ${user.nombre}`);
      
      const isValid = await bcrypt.compare('admin123', user.contrasena);
      console.log(`   Contraseña correcta: ${isValid ? '✅ SÍ' : '❌ NO'}`);
      
      if (!isValid) {
        console.log('\n💡 SOLUCIÓN: La BD tiene hash incorrecto. Re-crear con seed.');
      }
    }

    await conn.release();
    await pool.end();
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err);
  }
})();
