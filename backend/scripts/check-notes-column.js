const db = require('../models');

async function checkColumn() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected');
    
    const [results] = await db.sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'projects' 
      AND COLUMN_NAME = 'notes'
    `);
    
    if (results.length > 0) {
      console.log('✅ Notes column exists:', results[0]);
    } else {
      console.log('❌ Notes column does NOT exist');
    }
    
    await db.sequelize.close();
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

checkColumn();

