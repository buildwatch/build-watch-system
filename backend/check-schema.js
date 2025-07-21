const { sequelize } = require('./models');

async function checkSchema() {
  try {
    console.log('Checking projects table schema...');
    
    const [results] = await sequelize.query('DESCRIBE projects');
    console.log('\nProjects table columns:');
    results.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
    console.log('\nChecking if isActive column exists...');
    const isActiveExists = results.some(col => col.Field === 'isActive');
    console.log(`isActive column exists: ${isActiveExists}`);
    
    if (!isActiveExists) {
      console.log('\nAdding isActive column...');
      await sequelize.query('ALTER TABLE projects ADD COLUMN isActive BOOLEAN DEFAULT true');
      console.log('isActive column added successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema(); 