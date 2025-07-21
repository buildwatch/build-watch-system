const { sequelize } = require('./models');

async function cleanupDuplicateIndexes() {
  try {
    console.log('Cleaning up duplicate indexes from users table...');
    
    // Drop duplicate email indexes
    const emailIndexes = [
      'email_2', 'email_3', 'email_4', 'email_5', 'email_6', 'email_7', 'email_8', 'email_9',
      'email_10', 'email_11', 'email_12', 'email_13', 'email_14', 'email_15', 'email_16', 'email_17', 'email_18', 'email_19'
    ];
    
    for (const indexName of emailIndexes) {
      try {
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`users\``);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`Index ${indexName} doesn't exist or already dropped`);
      }
    }
    
    // Drop duplicate username indexes
    const usernameIndexes = [
      'username_2', 'username_3', 'username_4', 'username_5', 'username_6', 'username_7', 'username_8', 'username_9',
      'username_10', 'username_11', 'username_12', 'username_13', 'username_14', 'username_15', 'username_16', 'username_17', 'username_18', 'username_19'
    ];
    
    for (const indexName of usernameIndexes) {
      try {
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`users\``);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`Index ${indexName} doesn't exist or already dropped`);
      }
    }
    
    // Drop duplicate userId indexes
    const userIdIndexes = [
      'userId_2', 'userId_3', 'userId_4', 'userId_5', 'userId_6', 'userId_7', 'userId_8', 'userId_9',
      'userId_10', 'userId_11', 'userId_12', 'userId_13', 'userId_14', 'userId_15', 'userId_16', 'userId_17', 'userId_18', 'userId_19', 'userId_20'
    ];
    
    for (const indexName of userIdIndexes) {
      try {
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`users\``);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`Index ${indexName} doesn't exist or already dropped`);
      }
    }
    
    // Drop some other unnecessary indexes
    const otherIndexes = [
      'users_role',
      'users_status',
      'users_user_id'
    ];
    
    for (const indexName of otherIndexes) {
      try {
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`users\``);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`Index ${indexName} doesn't exist or already dropped`);
      }
    }
    
    console.log('Duplicate index cleanup completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up indexes:', error.message);
    process.exit(1);
  }
}

cleanupDuplicateIndexes(); 