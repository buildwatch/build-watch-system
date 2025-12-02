require('dotenv').config();
const db = require('../models');
const { QueryTypes, DataTypes } = require('sequelize');

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add remarks and approver fields to milestone_submissions...');
    
    // Test connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');
    
    const sequelize = db.sequelize;
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('milestone_submissions');
    
    // Add remarks column if it doesn't exist
    if (!tableDescription.remarks) {
      await queryInterface.addColumn('milestone_submissions', 'remarks', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Remarks and recommendation from the approver/reviewer'
      });
      console.log('✅ Added column: remarks');
    } else {
      console.log('ℹ️  Column "remarks" already exists');
    }
    
    // Add remarksAndRecommendation column if it doesn't exist
    if (!tableDescription.remarksAndRecommendation) {
      await queryInterface.addColumn('milestone_submissions', 'remarksAndRecommendation', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Remarks and recommendation from the approver/reviewer (alias for remarks)'
      });
      console.log('✅ Added column: remarksAndRecommendation');
    } else {
      console.log('ℹ️  Column "remarksAndRecommendation" already exists');
    }
    
    // Add approverFullName column if it doesn't exist
    if (!tableDescription.approverFullName) {
      await queryInterface.addColumn('milestone_submissions', 'approverFullName', {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Full name of the approver/reviewer for audit purposes'
      });
      console.log('✅ Added column: approverFullName');
    } else {
      console.log('ℹ️  Column "approverFullName" already exists');
    }
    
    // Add approverName column if it doesn't exist
    if (!tableDescription.approverName) {
      await queryInterface.addColumn('milestone_submissions', 'approverName', {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Name of the approver/reviewer (alias for approverFullName)'
      });
      console.log('✅ Added column: approverName');
    } else {
      console.log('ℹ️  Column "approverName" already exists');
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('❌ Error details:', error.message);
    process.exit(1);
  }
}

runMigration();

