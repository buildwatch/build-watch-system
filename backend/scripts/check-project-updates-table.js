const { ProjectUpdate } = require('../models');
const sequelize = require('../models').sequelize;

async function checkTableStructure() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get table description
    const [results] = await sequelize.query("DESCRIBE project_updates");
    console.log('\n📋 Project Updates Table Structure:');
    results.forEach(row => {
      console.log(`${row.Field}: ${row.Type} ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${row.Key || ''}`);
    });

  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  } finally {
    await sequelize.close();
  }
}

checkTableStructure(); 