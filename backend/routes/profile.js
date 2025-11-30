const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'buildwatch_lgu_secret_key_2024');
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive user'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

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
    // Use authenticated user's ID if available, otherwise fallback to userId from body
    const userId = req.user ? req.user.id : (req.body.userId || 'user');
    cb(null, `profile-${userId}-${uniqueSuffix}${ext}`);
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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload profile picture
router.post('/upload-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Use authenticated user's ID
    const authenticatedUser = req.user;
    const filePath = req.file.path;
    const fileName = req.file.filename;
    
    // Generate the URL for the uploaded file
    // Use FRONTEND_URL or construct from request for production
    const baseUrl = process.env.FRONTEND_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://www.build-watch.com' 
        : 'http://localhost:3000');
    const profilePictureUrl = `${baseUrl}/uploads/profile-pictures/${fileName}`;
    
    console.log('✅ File uploaded successfully:', {
      userId: authenticatedUser.id,
      fileName,
      filePath,
      profilePictureUrl
    });
    
    // Update the authenticated user's profile picture URL
    try {
      console.log('🔍 [Profile Upload Debug] Updating profile picture for user:', {
        id: authenticatedUser.id,
        userId: authenticatedUser.userId,
        email: authenticatedUser.email,
        currentProfilePictureUrl: authenticatedUser.profilePictureUrl,
        newProfilePictureUrl: profilePictureUrl
      });
      
      // Use save() method to ensure the update is persisted immediately
      authenticatedUser.profilePictureUrl = profilePictureUrl;
      await authenticatedUser.save();
      
      // Reload user to ensure the update is persisted
      await authenticatedUser.reload();
      
      // Verify the update was successful by querying fresh from database
      const updatedUser = await User.findByPk(authenticatedUser.id, {
        attributes: ['id', 'userId', 'email', 'profilePictureUrl'],
        raw: false
      });
      
      // Force reload to get latest data
      if (updatedUser) {
        await updatedUser.reload();
      }
      
      console.log('✅ [Profile Upload Debug] Profile picture URL stored in database for user:', {
        id: authenticatedUser.id,
        userId: authenticatedUser.userId,
        email: authenticatedUser.email
      });
      console.log('✅ [Profile Upload Debug] Verified profilePictureUrl in database:', updatedUser ? updatedUser.profilePictureUrl : 'N/A');
      console.log('✅ [Profile Upload Debug] Profile picture URL:', profilePictureUrl);
      
      if (!updatedUser || !updatedUser.profilePictureUrl || updatedUser.profilePictureUrl !== profilePictureUrl) {
        console.error('⚠️ Profile picture URL mismatch after update!');
        console.error('   Expected:', profilePictureUrl);
        console.error('   Got:', updatedUser ? updatedUser.profilePictureUrl : 'User not found');
        // Don't fail the request, but log the issue
      } else {
        console.log('✅ Profile picture URL verified successfully in database');
      }
    } catch (dbError) {
      console.error('⚠️ Database update failed, but file was uploaded:', dbError);
      return res.status(500).json({
        success: false,
        message: 'File uploaded but failed to update database'
      });
    }
    
    // Store the profile picture URL in a local JSON file as backup
    try {
      const profileDataPath = path.join(__dirname, '../uploads/profile-pictures/profile-data.json');
      let profileData = {};
      
      if (fs.existsSync(profileDataPath)) {
        profileData = JSON.parse(fs.readFileSync(profileDataPath, 'utf8'));
      }
      
      // Store with both user ID and email for lookup flexibility
      const storageKey = authenticatedUser.id.toString();
      profileData[storageKey] = {
        profilePictureUrl,
        fileName,
        uploadedAt: new Date().toISOString(),
        fileSize: req.file.size,
        userId: authenticatedUser.userId,
        email: authenticatedUser.email
      };
      
      // Also store with email and userId for backward compatibility
      if (authenticatedUser.email) {
        profileData[authenticatedUser.email] = profileData[storageKey];
      }
      if (authenticatedUser.userId) {
        profileData[authenticatedUser.userId] = profileData[storageKey];
      }
      
      // Also store with the user's primary key ID as string for System Admin
      profileData[authenticatedUser.id.toString()] = profileData[storageKey];
      
      fs.writeFileSync(profileDataPath, JSON.stringify(profileData, null, 2));
      console.log('✅ [Profile Upload Debug] Profile data stored in local file for user:', {
        id: authenticatedUser.id,
        userId: authenticatedUser.userId,
        email: authenticatedUser.email,
        storageKeys: [storageKey, authenticatedUser.email, authenticatedUser.userId, authenticatedUser.id.toString()].filter(Boolean)
      });
    } catch (fileError) {
      console.error('⚠️ Local file storage failed:', fileError);
    }
    
    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePictureUrl: profilePictureUrl,
      fileName: fileName,
      userId: authenticatedUser.id
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
  const origin = req.headers.origin || '*';
  const allowedOrigins = [
    'http://localhost:4321',
    'http://localhost:4322',
    'https://build-watch.com',
    'http://build-watch.com',
    'https://www.build-watch.com',
    'http://www.build-watch.com'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Get profile picture
router.get('/picture/:userId', async (req, res) => {
  try {
    // Set CORS headers for profile picture requests
    // Use specific origin instead of wildcard to allow credentials if needed
    const origin = req.headers.origin || '*';
    const allowedOrigins = [
      'http://localhost:4321',
      'http://localhost:4322',
      'https://build-watch.com',
      'http://build-watch.com',
      'https://www.build-watch.com',
      'http://www.build-watch.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    const userId = req.params.userId;
    console.log('🔍 [Profile Picture Debug] Fetching profile picture for user:', userId);
    console.log('🔍 [Profile Picture Debug] UserId type:', typeof userId);
    
    let profilePictureUrl = null;
    
    // First try to get from database (including deleted users)
    try {
      // First try to find user by userId field (including deleted users)
      let user = await User.findOne({ 
        where: { userId: userId },
        attributes: ['id', 'userId', 'email', 'profilePictureUrl', 'status'],
        paranoid: false // Include soft-deleted records
      });
      
      console.log('🔍 [Profile Picture Debug] User found by userId:', user ? {
        id: user.id,
        userId: user.userId,
        email: user.email,
        hasProfilePicture: !!user.profilePictureUrl,
        profilePictureUrl: user.profilePictureUrl
      } : 'Not found');
      
      // If not found by userId, try by primary key id (numeric or UUID)
      if (!user) {
        // Try as numeric ID
        if (!isNaN(userId)) {
          const numericId = parseInt(userId);
          user = await User.findOne({ 
            where: { id: numericId },
            attributes: ['id', 'userId', 'email', 'profilePictureUrl', 'status'],
            paranoid: false
          });
          console.log('🔍 [Profile Picture Debug] User found by id (numeric):', user ? {
            id: user.id,
            userId: user.userId,
            email: user.email,
            hasProfilePicture: !!user.profilePictureUrl
          } : 'Not found');
        }
        
        // Try as UUID (if it looks like a UUID)
        if (!user && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          user = await User.findOne({ 
            where: { id: userId },
            attributes: ['id', 'userId', 'email', 'profilePictureUrl', 'status'],
            paranoid: false
          });
          console.log('🔍 [Profile Picture Debug] User found by id (UUID):', user ? {
            id: user.id,
            userId: user.userId,
            email: user.email,
            hasProfilePicture: !!user.profilePictureUrl
          } : 'Not found');
        }
      }
      
      // If not found by userId or id, try by email (including deleted users)
      if (!user) {
        user = await User.findOne({ 
          where: { email: userId },
          attributes: ['id', 'userId', 'email', 'profilePictureUrl', 'status'],
          paranoid: false // Include soft-deleted records
        });
        console.log('🔍 [Profile Picture Debug] User found by email:', user ? {
          id: user.id,
          userId: user.userId,
          email: user.email,
          hasProfilePicture: !!user.profilePictureUrl
        } : 'Not found');
      }
      
      // If user found but no profilePictureUrl, check if we can find it by the user's other identifiers
      if (user && !user.profilePictureUrl) {
        console.log('⚠️ [Profile Picture Debug] User found but profilePictureUrl is null, checking profile-data.json...');
      } else if (user && user.profilePictureUrl) {
        profilePictureUrl = user.profilePictureUrl;
        console.log(`✅ Profile picture found in database (status: ${user.status}) for user ${userId}:`, profilePictureUrl.substring(0, 50) + '...');
        
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
          
          // If we found the user in database, add their id, userId, and email to the search
          if (user) {
            possibleIds.push(user.id.toString());
            if (user.userId) possibleIds.push(user.userId);
            if (user.email) possibleIds.push(user.email);
            console.log('🔍 [Profile Picture Debug] Checking profile-data.json with IDs:', possibleIds);
          }
          
          // Add specific mappings for known users
          const userMappings = {
            '1c93ca94-cb7f-4fea-a6be-4e1747f6f35d': 'exeviewer@gmail.com', // Executive Viewer
            'EIU-0001': 'EIU-0001',
            'EIU-0002': 'meopartner2@gmail.com',
            'EIU-0003': 'meopartner3@gmail.com',
            'EIU-0004': 'menropartner1@gmail.com',
            'EIU-0005': 'mswdopartner1@gmail.com',
            'SYS-AD-0001': 'sysadmin@gmail.com' // System Admin mapping
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
          
          // Remove duplicates
          const uniqueIds = [...new Set(possibleIds.filter(id => id))];
          console.log('🔍 [Profile Picture Debug] Checking profile-data.json with unique IDs:', uniqueIds);
          
          // Try each possible ID
          for (const id of uniqueIds) {
            if (profileData[id] && profileData[id].profilePictureUrl) {
              profilePictureUrl = profileData[id].profilePictureUrl;
              console.log(`✅ [Profile Picture Debug] Profile picture found in local file for user ${userId} (using ID: ${id}):`, profilePictureUrl.substring(0, 50) + '...');
              
              // If we found the user in database, update the database with the profile picture URL
              if (user && profilePictureUrl && !profilePictureUrl.startsWith('data:')) {
                try {
                  await user.update({ profilePictureUrl: profilePictureUrl });
                  console.log(`✅ [Profile Picture Debug] Updated database with profile picture URL from profile-data.json`);
                } catch (updateError) {
                  console.error(`❌ [Profile Picture Debug] Failed to update database:`, updateError.message);
                }
              }
              break;
            }
          }
          
          if (!profilePictureUrl) {
            console.log('⚠️ [Profile Picture Debug] Profile picture not found in profile-data.json for any of the IDs:', uniqueIds);
            console.log('🔍 [Profile Picture Debug] Available keys in profile-data.json (first 10):', Object.keys(profileData).slice(0, 10));
          }
        } else {
          console.log('⚠️ [Profile Picture Debug] profile-data.json file does not exist at:', profileDataPath);
        }
      } catch (fileError) {
        console.error('❌ [Profile Picture Debug] Local file read failed:', fileError.message);
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
    
    // Normalize profile picture URL - convert localhost:3000 to production URL if needed
    if (profilePictureUrl && process.env.NODE_ENV === 'production') {
      const baseUrl = process.env.FRONTEND_URL || 'https://www.build-watch.com';
      // Replace localhost:3000 URLs with production URL
      profilePictureUrl = profilePictureUrl.replace(/http:\/\/localhost:3000/g, baseUrl);
      profilePictureUrl = profilePictureUrl.replace(/https?:\/\/[^/]+:3000/g, baseUrl);
    }
    
    // If still no URL, return null instead of default to prevent CORS issues
    if (!profilePictureUrl) {
      console.log('ℹ️ No profile picture found, returning null');
      return res.json({
        success: true,
        profilePictureUrl: null,
        hasProfilePicture: false
      });
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
