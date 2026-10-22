const mysql = require('mysql2/promise');

(async () => {
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '45711575',
      database: 'recursos_hidricos_sde'
    });

    const conn = await pool.getConnection();
    console.log('\n✅ Conectado a la BD\n');

    // Obtener usuarios
    const [usuarios] = await conn.query('SELECT id, correo, nombre, contrasena FROM usuarios');
    
    console.log('📋 USUARIOS EN BASE DE DATOS:\n');
    usuarios.forEach(u => {
      console.log(`  Correo: ${u.correo}`);
      console.log(`  Nombre: ${u.nombre}`);
      console.log(`  Hash: ${u.contrasena.substring(0, 30)}...`);
      console.log('');
    });

    await conn.release();
    await pool.end();
    
    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
