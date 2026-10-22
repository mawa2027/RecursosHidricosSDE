const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('\n🧪 TEST LOGIN DIRECTO AL BACKEND\n');
    
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: 'admin@recursoshidricos.gob.ar',
        contrasena: 'admin123'
      })
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Respuesta:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLogin();
