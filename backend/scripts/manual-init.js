require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

async function manualInit() {
  console.log('🔄 Manual Database Initialization...');
  console.log('⏰ Start time:', new Date().toISOString());
  
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'buildwatch_lgu',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'buildwatch_123',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false, // Disable logging for cleaner output
      timezone: '+08:00'
    }
  );

  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    console.log('📄 Reading SQL schema file...');
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔧 Executing schema...');
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await sequelize.query(statement);
          console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 Manual database initialization completed!');
    console.log('📋 Database is ready with all tables and sample data');
    
  } catch (error) {
    console.error('❌ Manual initialization failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if this script is executed directly
if (require.main === module) {
  manualInit();
}

module.exports = manualInit; 