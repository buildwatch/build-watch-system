const { sequelize } = require('./models');

async function fixIndexes() {
  try {
    console.log('Fixing database indexes to resolve MySQL key limit...');
    
    // Drop some unnecessary indexes from users table
    console.log('Dropping unnecessary indexes from users table...');
    
    // Drop indexes that might be causing the issue
    const dropIndexes = [
      'DROP INDEX IF EXISTS `users_username_unique` ON `users`',
      'DROP INDEX IF EXISTS `users_email_unique` ON `users`',
      'DROP INDEX IF EXISTS `users_userId_unique` ON `users`',
      'DROP INDEX IF EXISTS `users_role_index` ON `users`',
      'DROP INDEX IF EXISTS `users_status_index` ON `users`',
      'DROP INDEX IF EXISTS `users_createdAt_index` ON `users`',
      'DROP INDEX IF EXISTS `users_updatedAt_index` ON `users`'
    ];
    
    for (const dropIndex of dropIndexes) {
      try {
        await sequelize.query(dropIndex);
        console.log(`Executed: ${dropIndex}`);
      } catch (error) {
        console.log(`Index doesn't exist or already dropped: ${dropIndex}`);
      }
    }
    
    // Drop indexes from other tables that might be contributing
    console.log('Dropping unnecessary indexes from other tables...');
    
    const otherTableIndexes = [
      'DROP INDEX IF EXISTS `project_updates_updateType_index` ON `project_updates`',
      'DROP INDEX IF EXISTS `project_updates_submittedByRole_index` ON `project_updates`',
      'DROP INDEX IF EXISTS `project_updates_createdAt_index` ON `project_updates`',
      'DROP INDEX IF EXISTS `project_milestones_dueDate_index` ON `project_milestones`',
      'DROP INDEX IF EXISTS `project_milestones_priority_index` ON `project_milestones`',
      'DROP INDEX IF EXISTS `project_milestones_dependsOn_index` ON `project_milestones`'
    ];
    
    for (const dropIndex of otherTableIndexes) {
      try {
        await sequelize.query(dropIndex);
        console.log(`Executed: ${dropIndex}`);
      } catch (error) {
        console.log(`Index doesn't exist or already dropped: ${dropIndex}`);
      }
    }
    
    console.log('Index cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error.message);
    process.exit(1);
  }
}

fixIndexes(); 