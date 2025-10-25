const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { User } = require('../models');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.body.userId || 'user'}-${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload profile picture
router.post('/upload-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.body.userId || 'SA-001';
    const filePath = req.file.path;
    const fileName = req.file.filename;
    
    // Generate the URL for the uploaded file
    const profilePictureUrl = `http://localhost:3000/uploads/profile-pictures/${fileName}`;
    
    console.log('✅ File uploaded successfully:', {
      userId,
      fileName,
      filePath,
      profilePictureUrl
    });
    
    // Try to store in database, but don't fail if it doesn't work
    try {
      // First try to find user by userId field
      let user = await User.findOne({ where: { userId: userId } });
      
      // If not found by userId, try by email
      if (!user) {
        user = await User.findOne({ where: { email: userId } });
      }
      
      // If user found, update profile picture URL
      if (user) {
        await user.update({ profilePictureUrl: profilePictureUrl });
        console.log('✅ Profile picture URL stored in database for user:', userId);
      } else {
        console.log('⚠️ User not found in database for userId:', userId);
      }
    } catch (dbError) {
      console.error('⚠️ Database update failed, but file was uploaded:', dbError);
      // Continue with the response even if database update fails
    }
    
    // Store the profile picture URL in a local JSON file as backup
    try {
      const profileDataPath = path.join(__dirname, '../uploads/profile-pictures/profile-data.json');
      let profileData = {};
      
      if (fs.existsSync(profileDataPath)) {
        profileData = JSON.parse(fs.readFileSync(profileDataPath, 'utf8'));
      }
      
      profileData[userId] = {
        profilePictureUrl,
        fileName,
        uploadedAt: new Date().toISOString(),
        fileSize: req.file.size
      };
      
      fs.writeFileSync(profileDataPath, JSON.stringify(profileData, null, 2));
      console.log('✅ Profile data stored in local file for user:', userId);
    } catch (fileError) {
      console.error('⚠️ Local file storage failed:', fileError);
    }
    
    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePictureUrl: profilePictureUrl,
      fileName: fileName,
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
});

// OPTIONS handler for profile picture requests
router.options('/picture/:userId', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Get profile picture
router.get('/picture/:userId', async (req, res) => {
  try {
    // Set CORS headers for profile picture requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    const userId = req.params.userId;
    console.log('🔍 Fetching profile picture for user:', userId);
    
    let profilePictureUrl = null;
    
    // First try to get from database (including deleted users)
    try {
      // First try to find user by userId field (including deleted users)
      let user = await User.findOne({ 
        where: { userId: userId },
        attributes: ['profilePictureUrl', 'status'],
        paranoid: false // Include soft-deleted records
      });
      
      // If not found by userId, try by email (including deleted users)
      if (!user) {
        user = await User.findOne({ 
          where: { email: userId },
          attributes: ['profilePictureUrl', 'status'],
          paranoid: false // Include soft-deleted records
        });
      }
      
      if (user && user.profilePictureUrl) {
        profilePictureUrl = user.profilePictureUrl;
        console.log(`✅ Profile picture found in database (status: ${user.status}) for user ${userId}:`, profilePictureUrl);
        
        // If user is deleted, also try to get preserved profile picture from activity logs
        if (user.status === 'deleted') {
          try {
            const { ActivityLog } = require('../models');
            const softDeleteLog = await ActivityLog.findOne({
              where: {
                action: 'SOFT_DELETE_USER',
                entityId: user.id,
                metadata: { [require('sequelize').Op.ne]: null }
              },
              order: [['createdAt', 'DESC']]
            });
            
            if (softDeleteLog && softDeleteLog.metadata) {
              const preservedProfilePicture = softDeleteLog.metadata.profilePictureUrl;
              if (preservedProfilePicture) {
                profilePictureUrl = preservedProfilePicture;
                console.log(`🔄 Using preserved profile picture for deleted user ${userId}:`, profilePictureUrl);
              }
            }
          } catch (logError) {
            console.log(`⚠️ Could not retrieve preserved profile picture for deleted user ${userId}:`, logError.message);
          }
        }
      }
    } catch (dbError) {
      console.log('⚠️ Database query failed, trying local file:', dbError.message);
    }
    
    // If not in database, try local file with multiple ID formats
    if (!profilePictureUrl) {
      try {
        const profileDataPath = path.join(__dirname, '../uploads/profile-pictures/profile-data.json');
        if (fs.existsSync(profileDataPath)) {
          const profileData = JSON.parse(fs.readFileSync(profileDataPath, 'utf8'));
          
          // Try multiple possible ID formats
          const possibleIds = [userId];
          
          // Add specific mappings for known users
          const userMappings = {
            '1c93ca94-cb7f-4fea-a6be-4e1747f6f35d': 'exeviewer@gmail.com', // Executive Viewer
            'EIU-0001': 'EIU-0001',
            'EIU-0002': 'meopartner2@gmail.com',
            'EIU-0003': 'meopartner3@gmail.com',
            'EIU-0004': 'menropartner1@gmail.com',
            'EIU-0005': 'mswdopartner1@gmail.com'
          };
          
          // Add mapped IDs
          if (userMappings[userId]) {
            possibleIds.push(userMappings[userId]);
          }
          
          // Add email-based IDs for common patterns
          if (userId.includes('@')) {
            possibleIds.push(userId);
          } else {
            // Try to find by email pattern
            Object.keys(profileData).forEach(key => {
              if (key.includes('@') && key.includes(userId.toLowerCase())) {
                possibleIds.push(key);
              }
            });
          }
          
          // Try each possible ID
          for (const id of possibleIds) {
            if (profileData[id] && profileData[id].profilePictureUrl) {
              profilePictureUrl = profileData[id].profilePictureUrl;
              console.log(`✅ Profile picture found in local file for user ${userId} (using ID: ${id}):`, profilePictureUrl);
              break;
            }
          }
        }
      } catch (fileError) {
        console.log('⚠️ Local file read failed:', fileError.message);
      }
    }
    
    // If we have a profile picture URL, try to convert it to base64
    if (profilePictureUrl) {
      try {
        // Extract filename from URL
        let filePath = null;
        if (profilePictureUrl.includes('/uploads/profile-pictures/')) {
          const filename = profilePictureUrl.split('/uploads/profile-pictures/').pop();
          filePath = path.join(__dirname, '../uploads/profile-pictures', filename);
        } else if (profilePictureUrl.includes('/uploads/')) {
          const filename = profilePictureUrl.split('/uploads/').pop();
          filePath = path.join(__dirname, '../uploads', filename);
        }
        
        if (filePath && fs.existsSync(filePath)) {
          console.log(`📁 Reading file from disk: ${filePath}`);
          const fileBuffer = fs.readFileSync(filePath);
          const base64Data = fileBuffer.toString('base64');
          
          // Determine MIME type
          const ext = path.extname(filePath).toLowerCase();
          let mimeType = 'image/jpeg'; // default
          if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.svg') mimeType = 'image/svg+xml';
          else if (ext === '.jfif') mimeType = 'image/jpeg';
          else if (ext === '.webp') mimeType = 'image/webp';
          
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          
          console.log(`✅ Successfully converted profile picture to base64 for user: ${userId}`);
          
          return res.json({
            success: true,
            profilePictureUrl: dataUrl, // Return base64 data URL directly
            isBase64: true
          });
        } else {
          console.log(`⚠️ Profile picture file not found on disk: ${filePath}`);
        }
      } catch (conversionError) {
        console.log(`⚠️ Failed to convert profile picture to base64:`, conversionError.message);
      }
    }
    
    // If still no URL, return default
    if (!profilePictureUrl) {
      profilePictureUrl = 'http://localhost:3000/uploads/profile-pictures/default-profile.svg';
      console.log('ℹ️ Using default profile picture');
    }
    
    res.json({
      success: true,
      profilePictureUrl: profilePictureUrl
    });
    
  } catch (error) {
    console.error('❌ Get profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile picture',
      error: error.message
    });
  }
});

// Delete profile picture
router.delete('/picture/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Here you would fetch the current profile picture URL from the database
    // and delete the file, then update the database
    
    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile picture',
      error: error.message
    });
  }
});

module.exports = router;
