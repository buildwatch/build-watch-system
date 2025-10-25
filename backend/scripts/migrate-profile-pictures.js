require('dotenv').config();
const { User } = require('../models');
const fs = require('fs');
const path = require('path');

async function migrateProfilePictures() {
  try {
    console.log('🔄 Migrating profile pictures from JSON to database...');
    
    // Test database connection
    await User.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Read the profile data JSON file
    const profileDataPath = path.join(__dirname, '../uploads/profile-pictures/profile-data.json');
    
    if (!fs.existsSync(profileDataPath)) {
      console.log('⚠️ Profile data JSON file not found, skipping migration');
      return;
    }
    
    const profileData = JSON.parse(fs.readFileSync(profileDataPath, 'utf8'));
    console.log(`📊 Found ${Object.keys(profileData).length} profile picture entries in JSON file`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Migrate each profile picture
    for (const [userId, data] of Object.entries(profileData)) {
      try {
        console.log(`🔄 Migrating profile picture for: ${userId}`);
        
        // Try to find user by userId field first
        let user = await User.findOne({ where: { userId: userId } });
        
        // If not found by userId, try by email
        if (!user) {
          user = await User.findOne({ where: { email: userId } });
        }
        
        if (user) {
          await user.update({ profilePictureUrl: data.profilePictureUrl });
          console.log(`✅ Updated profile picture for user: ${user.name || user.username} (${userId})`);
          successCount++;
        } else {
          console.log(`⚠️ User not found for ID: ${userId}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error migrating profile picture for ${userId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${successCount} profile pictures`);
    console.log(`❌ Failed migrations: ${errorCount} profile pictures`);
    
    // Verify some migrations
    console.log('\n🔍 Verifying migrations...');
    const usersWithPictures = await User.findAll({
      where: {
        profilePictureUrl: { [User.sequelize.Sequelize.Op.ne]: null }
      },
      attributes: ['name', 'username', 'email', 'profilePictureUrl']
    });
    
    console.log(`✅ Found ${usersWithPictures.length} users with profile pictures in database`);
    usersWithPictures.forEach(user => {
      console.log(`  - ${user.name || user.username}: ${user.profilePictureUrl}`);
    });
    
  } catch (error) {
    console.error('❌ Error during profile picture migration:', error);
    throw error;
  } finally {
    await User.sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migrateProfilePictures()
    .then(() => {
      console.log('🎉 Profile picture migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Profile picture migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateProfilePictures;
