require('dotenv').config();
const { Sequelize } = require('sequelize');

async function testConnection() {
  console.log('🔍 Testing Build Watch LGU Database Connection...');
  console.log('⏰ Start time:', new Date().toISOString());
  
  // Log database configuration
  console.log('📊 Database Configuration:');
  console.log('- Host:', process.env.DB_HOST || 'localhost');
  console.log('- Port:', process.env.DB_PORT || 3306);
  console.log('- Database:', process.env.DB_NAME || 'buildwatch_lgu');
  console.log('- User:', process.env.DB_USER || 'root');
  console.log('- Environment:', process.env.NODE_ENV || 'development');
  
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'buildwatch_lgu',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'buildwatch_123',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: console.log,
      timezone: '+08:00',
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );

  try {
    console.log('\n🔌 Attempting database connection...');
    const connectionStart = new Date();
    
    await sequelize.authenticate();
    
    const connectionEnd = new Date();
    const connectionTime = connectionEnd - connectionStart;
    console.log(`✅ Database connection successful in ${connectionTime}ms`);
    console.log('⏰ Connection completed at:', connectionEnd.toISOString());
    
    // Test a simple query
    console.log('\n🔍 Testing simple query...');
    const queryStart = new Date();
    
    const [results] = await sequelize.query('SELECT 1 as test');
    
    const queryEnd = new Date();
    const queryTime = queryEnd - queryStart;
    console.log(`✅ Query successful in ${queryTime}ms`);
    console.log('📊 Query result:', results);
    
    console.log('\n🎉 Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
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
    console.log('\n🔌 Closing connection...');
    await sequelize.close();
    console.log('✅ Connection closed');
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testConnection();
}

module.exports = testConnection; 