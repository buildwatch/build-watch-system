require('dotenv').config();
const { User } = require('../models');

async function addProfilePictureField() {
  try {
    console.log('🔧 Adding profilePictureUrl field to users table...');
    
    // Test database connection
    await User.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Add the profilePictureUrl column
    await User.sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN profilePictureUrl VARCHAR(500) NULL 
      AFTER deletedAt
    `);
    
    console.log('✅ profilePictureUrl field added successfully to users table');
    
    // Verify the field was added
    const [results] = await User.sequelize.query(`
      DESCRIBE users
    `);
    
    const profilePictureField = results.find(field => field.Field === 'profilePictureUrl');
    if (profilePictureField) {
      console.log('✅ Field verification successful:', profilePictureField);
    } else {
      console.log('❌ Field verification failed - profilePictureUrl not found');
    }
    
  } catch (error) {
    console.error('❌ Error adding profilePictureUrl field:', error);
    
    // Check if field already exists
    if (error.message.includes('Duplicate column name')) {
      console.log('ℹ️ profilePictureUrl field already exists in the table');
    } else {
      throw error;
    }
  } finally {
    await User.sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  addProfilePictureField()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addProfilePictureField;
