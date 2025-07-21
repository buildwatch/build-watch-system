require('dotenv').config();

console.log('🔍 Debugging Environment Variables...');
console.log('⏰ Time:', new Date().toISOString());

console.log('\n📊 Environment Variables:');
console.log('- DB_HOST:', process.env.DB_HOST);
console.log('- DB_PORT:', process.env.DB_PORT);
console.log('- DB_NAME:', process.env.DB_NAME);
console.log('- DB_USER:', process.env.DB_USER);
console.log('- DB_PASS:', process.env.DB_PASS ? '***SET***' : 'NOT SET');
console.log('- NODE_ENV:', process.env.NODE_ENV);

console.log('\n📁 Current Directory:', process.cwd());
console.log('📄 .env file exists:', require('fs').existsSync('.env'));

if (require('fs').existsSync('.env')) {
  console.log('📄 .env file contents:');
  const envContent = require('fs').readFileSync('.env', 'utf8');
  console.log(envContent);
}

console.log('\n✅ Environment debug completed'); 