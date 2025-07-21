require('dotenv').config();
const db = require('../models');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing Build Watch LGU Database...');
    console.log('⏰ Start time:', new Date().toISOString());
    
    // Log database configuration
    console.log('📊 Database Configuration:');
    console.log('- Host:', process.env.DB_HOST || 'localhost');
    console.log('- Port:', process.env.DB_PORT || 3306);
    console.log('- Database:', process.env.DB_NAME || 'buildwatch_lgu');
    console.log('- User:', process.env.DB_USER || 'root');
    console.log('- Environment:', process.env.NODE_ENV || 'development');
    
    console.log('\n🔌 Testing database connection...');
    const connectionStart = new Date();
    
    // Test database connection
    await db.sequelize.authenticate();
    
    const connectionEnd = new Date();
    const connectionTime = connectionEnd - connectionStart;
    console.log(`✅ Database connection established successfully in ${connectionTime}ms`);
    console.log('⏰ Connection completed at:', connectionEnd.toISOString());
    
    console.log('\n📋 Starting database synchronization...');
    console.log('⚠️  Using force: true - this will DROP and recreate all tables!');
    const syncStart = new Date();
    
    // Sync all models (create tables) - using force to avoid alter issues
    await db.sequelize.sync({ force: true });
    
    const syncEnd = new Date();
    const syncTime = syncEnd - syncStart;
    console.log(`✅ Database tables synchronized successfully in ${syncTime}ms`);
    console.log('⏰ Sync completed at:', syncEnd.toISOString());
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('⏰ Total time:', new Date() - new Date(connectionStart.toISOString()), 'ms');
    
    console.log('\n📋 Database Schema Summary:');
    console.log('- Users table: User management with roles and authentication');
    console.log('- Projects table: Project information and tracking');
    console.log('- Project Updates table: Progress updates and validation');
    console.log('- RPMES Forms table: Forms 1-4 with versioning');
    console.log('- Monitoring Reports table: Monitoring activities and validation');
    console.log('- Site Visits table: Site visit scheduling and tracking');
    console.log('- Uploads table: File management with polymorphic relationships');
    console.log('- Project Issues table: Issue tracking and escalation');
    console.log('- Project Feedback table: Stakeholder feedback');
    console.log('- Activity Logs table: User activity tracking');
    console.log('- Notifications table: System notifications and alerts');
    console.log('- Site Visit Participants table: Junction table for visit participants');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('⏰ Error occurred at:', new Date().toISOString());
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await db.sequelize.close();
    console.log('✅ Database connection closed');
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase; 