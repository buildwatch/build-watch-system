const db = require('../models');

async function addEiuReassignedAtColumn() {
  try {
    console.log('🔄 Adding eiuReassignedAt column to Projects table...');
    
    const sequelize = db.sequelize;
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('Projects');
    if (tableDescription.eiuReassignedAt) {
      console.log('✅ Column eiuReassignedAt already exists');
      return;
    }
    
    // Add the column
    await queryInterface.addColumn('Projects', 'eiuReassignedAt', {
      type: db.Sequelize.DATE,
      allowNull: true,
      comment: 'Date and time when EIU was reassigned to a new partner contractor'
    });
    
    console.log('✅ Successfully added eiuReassignedAt column to Projects table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding eiuReassignedAt column:', error);
    process.exit(1);
  }
}

addEiuReassignedAtColumn();

