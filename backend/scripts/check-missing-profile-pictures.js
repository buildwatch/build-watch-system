#!/usr/bin/env node
/**
 * Check for missing profile pictures
 * 
 * This script:
 * 1. Checks which profile pictures in the database don't have corresponding files
 * 2. Lists all missing files
 * 3. Provides recommendations
 * 
 * Run: node scripts/check-missing-profile-pictures.js
 */

const path = require('path');
const fs = require('fs');
const { User, sequelize } = require('../models');

const uploadsDir = path.join(__dirname, '../uploads/profile-pictures');

async function checkMissingProfilePictures() {
  console.log('🔍 Checking for missing profile pictures...');
  console.log('==========================================\n');
  
  try {
    // Get all users with profile pictures
    const users = await User.findAll({
      where: {
        profilePictureUrl: {
          [require('sequelize').Op.ne]: null,
          [require('sequelize').Op.ne]: ''
        }
      },
      attributes: ['id', 'userId', 'email', 'name', 'profilePictureUrl'],
      raw: false
    });

    console.log(`📊 Found ${users.length} users with profile picture URLs\n`);

    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log(`❌ Uploads directory does not exist: ${uploadsDir}`);
      console.log(`   💡 Run: bash scripts/setup-uploads-directory.sh\n`);
      return;
    }

    // Get list of files in uploads directory
    const existingFiles = new Set();
    try {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file !== 'profile-data.json' && file !== '.gitkeep') {
          existingFiles.add(file);
        }
      });
      console.log(`📁 Found ${existingFiles.size} files in uploads directory\n`);
    } catch (error) {
      console.log(`⚠️  Error reading uploads directory: ${error.message}\n`);
    }

    // Check each user's profile picture
    const missingFiles = [];
    const foundFiles = [];
    const invalidUrls = [];

    users.forEach(user => {
      const profileUrl = user.profilePictureUrl;
      
      if (!profileUrl) {
        return;
      }

      // Extract filename from URL
      let filename = null;
      if (profileUrl.includes('/uploads/profile-pictures/')) {
        filename = profileUrl.split('/uploads/profile-pictures/').pop().split('?')[0];
      } else if (profileUrl.includes('profile-')) {
        // Try to extract from any URL format
        const match = profileUrl.match(/profile-[^/]+\.(jpg|jpeg|png|gif|jfif|webp)/i);
        if (match) {
          filename = match[0];
        }
      }

      if (!filename) {
        invalidUrls.push({
          user: user.userId || user.email,
          url: profileUrl
        });
        return;
      }

      if (existingFiles.has(filename)) {
        foundFiles.push({
          user: user.userId || user.email,
          name: user.name,
          filename: filename
        });
      } else {
        missingFiles.push({
          user: user.userId || user.email,
          name: user.name,
          email: user.email,
          filename: filename,
          url: profileUrl
        });
      }
    });

    // Report results
    console.log('📋 Results:');
    console.log('==========================================\n');
    
    console.log(`✅ Found files: ${foundFiles.length}`);
    if (foundFiles.length > 0 && foundFiles.length <= 10) {
      foundFiles.forEach(item => {
        console.log(`   - ${item.user} (${item.name}): ${item.filename}`);
      });
    } else if (foundFiles.length > 10) {
      console.log(`   (Showing first 10 of ${foundFiles.length})`);
      foundFiles.slice(0, 10).forEach(item => {
        console.log(`   - ${item.user} (${item.name}): ${item.filename}`);
      });
    }
    console.log('');

    console.log(`❌ Missing files: ${missingFiles.length}`);
    if (missingFiles.length > 0) {
      console.log('\n   Missing profile pictures:');
      missingFiles.forEach(item => {
        console.log(`   - ${item.user} (${item.name || item.email})`);
        console.log(`     Filename: ${item.filename}`);
        console.log(`     URL: ${item.url.substring(0, 80)}...`);
      });
      console.log('');
    }

    if (invalidUrls.length > 0) {
      console.log(`⚠️  Invalid URLs: ${invalidUrls.length}`);
      invalidUrls.forEach(item => {
        console.log(`   - ${item.user}: ${item.url.substring(0, 80)}...`);
      });
      console.log('');
    }

    // Recommendations
    console.log('💡 Recommendations:');
    console.log('==========================================\n');
    
    if (missingFiles.length > 0) {
      console.log('1. Missing profile pictures can be handled in two ways:');
      console.log('   a) Migrate files from development server (if available)');
      console.log('   b) Users can re-upload their profile pictures');
      console.log('   c) The backend will serve a default placeholder (if configured)\n');
      
      console.log('2. To migrate files from local development:');
      console.log('   - Copy files from local: backend/uploads/profile-pictures/');
      console.log('   - To server: /root/build-watch-system/backend/uploads/profile-pictures/\n');
      
      console.log('3. To create a default profile picture:');
      console.log('   - Create a default image at: backend/uploads/profile-pictures/default-profile.png');
      console.log('   - The backend will automatically use it for missing files\n');
    } else {
      console.log('✅ All profile pictures are present!\n');
    }

    // Generate migration script if needed
    if (missingFiles.length > 0) {
      console.log('📝 Missing files list (for migration):');
      missingFiles.forEach(item => {
        console.log(`   ${item.filename}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkMissingProfilePictures();

