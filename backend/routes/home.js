const express = require('express');
const { Project, User, ActivityLog } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Get home page statistics
router.get('/stats', async (req, res) => {
  try {
    // Get project statistics
    const projectStats = await Project.findAll({
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalProjects'],
        [require('sequelize').fn('SUM', require('sequelize').col('totalBudget')), 'totalBudget'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN status IN ("ongoing", "delayed") THEN 1 END')), 'ongoingProjects'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN status = "completed" THEN 1 END')), 'completedProjects'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN status = "pending" THEN 1 END')), 'planningProjects']
      ],
      where: {
        status: {
          [Op.ne]: 'deleted'
        }
      }
    });

    // Get all projects to calculate utilized budget and average progress using ProgressCalculationService
    const allProjects = await Project.findAll({
      where: {
        status: {
          [Op.ne]: 'deleted'
        }
      }
    });

    // Calculate utilized budget and average progress using ProgressCalculationService
    const ProgressCalculationService = require('../services/progressCalculationService');
    let utilizedBudget = 0;
    let totalProgress = 0;
    let projectsWithProgress = 0;
    
    for (const project of allProjects) {
      try {
        const progress = await ProgressCalculationService.calculateProjectProgress(project.id, 'executive');
        // Use budget division progress for utilized budget calculation
        const budgetProgress = progress?.progress?.budget || 0;
        utilizedBudget += (parseFloat(project.totalBudget) || 0) * (budgetProgress / 100);
        
        // Calculate average progress
        const overallProgress = progress?.progress?.overall || 0;
        if (overallProgress > 0) {
          totalProgress += overallProgress;
          projectsWithProgress++;
        }
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
        // Fallback to database progress
        const projectProgress = parseFloat(project.overallProgress) || 0;
        utilizedBudget += (parseFloat(project.totalBudget) || 0) * (projectProgress / 100);
        
        if (projectProgress > 0) {
          totalProgress += projectProgress;
          projectsWithProgress++;
        }
      }
    }
    
    // Calculate average progress
    const averageProgress = projectsWithProgress > 0 ? Math.round((totalProgress / projectsWithProgress) * 100) / 100 : 0;

    // Get user statistics
    const userStats = await User.count({
      where: {
        status: 'active',
        deletedAt: null
      }
    });

    // Get department count (unique departments from users)
    const departmentStats = await User.findAll({
      attributes: [
        [require('sequelize').fn('DISTINCT', require('sequelize').col('department')), 'department']
      ],
      where: {
        department: {
          [Op.ne]: null
        },
        status: 'active',
        deletedAt: null
      }
    });

    const stats = projectStats[0]?.dataValues || {};
    const totalBudget = parseFloat(stats.totalBudget) || 0;
    const budgetUtilization = totalBudget > 0 ? (utilizedBudget / totalBudget) * 100 : 0;
    
    res.json({
      success: true,
      totalProjects: parseInt(stats.totalProjects) || 0,
      ongoingProjects: parseInt(stats.ongoingProjects) || 0,
      completedProjects: parseInt(stats.completedProjects) || 0,
      delayedProjects: 0, // Calculate this if needed
      totalBudget: totalBudget,
      utilizedBudget: utilizedBudget,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      averageProgress: averageProgress,
      activeDepartments: departmentStats.length
    });

  } catch (error) {
    console.error('Error fetching home stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch home statistics'
    });
  }
});

// Get featured projects for home page
router.get('/featured-projects', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Get projects that are approved and visible to public (exclude pending projects)
    const featuredProjects = await Project.findAll({
      where: {
        status: {
          [Op.in]: ['ongoing', 'completed', 'delayed']
        },
        [Op.or]: [
          { approvedByMPMEC: true },
          { approvedBySecretariat: true }
        ] // Show projects approved by either MPMEC or Secretariat
      },
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        ['overallProgress', 'DESC']
      ],
      limit: parseInt(limit)
    });

    // Calculate progress for each project using ProgressCalculationService
    const ProgressCalculationService = require('../services/progressCalculationService');
    const projectsWithProgress = await Promise.all(featuredProjects.map(async (project) => {
      try {
        const progress = await ProgressCalculationService.calculateProjectProgress(project.id, 'public');
        return {
          ...project.toJSON(),
          progress
        };
      } catch (error) {
        console.error(`Error calculating progress for project ${project.name}:`, error);
        return {
          ...project.toJSON(),
          progress: { overall: 0 }
        };
      }
    }));

    // Format projects for frontend
    const formattedProjects = projectsWithProgress.map(project => {
      // Use the progress data directly from the calculation service
      const progressValue = project.progress?.progress?.overall || 0;
      const timelineProgress = project.progress?.progress?.timeline || 0;
      const budgetProgress = project.progress?.progress?.budget || 0;
      const physicalProgress = project.progress?.progress?.physical || 0;
      
      return {
        id: project.id,
        name: project.name,
        projectCode: project.projectCode,
        location: project.location || 'Santa Cruz, Laguna',
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.totalBudget,
        totalBudget: project.totalBudget,
        progress: progressValue,
        timelineProgress: timelineProgress,
        budgetProgress: budgetProgress,
        physicalProgress: physicalProgress,
        implementingOffice: project.implementingOffice?.name || 'Municipal Government',
        implementingOfficeName: project.implementingOffice?.name || 'Municipal Government',
        description: project.description,
        category: project.category,
        fundingSource: project.fundingSource,
        initialPhoto: project.initialPhoto,
        latitude: project.latitude,
        longitude: project.longitude,
        priority: project.priority
      };
    });

    res.json({
      success: true,
      projects: formattedProjects
    });

  } catch (error) {
    console.error('Error fetching featured projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured projects'
    });
  }
});

// Get recent activity for home page
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentActivity = await ActivityLog.findAll({
      where: {
        action: {
          [Op.in]: ['PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_APPROVED', 'PROJECT_COMPLETED']
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Format activity for frontend
    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      user: activity.user?.name || 'System',
      timestamp: activity.createdAt,
      entityType: activity.entityType,
      entityId: activity.entityId
    }));

    res.json({
      success: true,
      activities: formattedActivity
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
});

// Get project locations for map
router.get('/project-locations', async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: {
        status: {
          [Op.in]: ['ongoing', 'completed', 'delayed', 'planning']
        },
        // Only show approved projects to the public (same as projects.astro)
        approvedBySecretariat: true
      },
      attributes: [
        'id',
        'name',
        'location',
        'status',
        'totalBudget',
        'overallProgress',
        'startDate',
        'endDate',
        'category'
      ]
    });

    // Calculate progress for each project using ProgressCalculationService
    const ProgressCalculationService = require('../services/progressCalculationService');
    const projectsWithProgress = await Promise.all(projects.map(async (project) => {
      const progress = await ProgressCalculationService.calculateProjectProgress(project.id, 'public');
      return {
        ...project.toJSON(),
        progress
      };
    }));

    // Format for map display
    const locations = projectsWithProgress.map(project => ({
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status,
      budget: project.totalBudget,
      progress: project.progress?.progress?.overall || project.progress?.overall || project.overallProgress || 0,
      startDate: project.startDate,
      endDate: project.endDate,
      category: project.category
    }));

    res.json({
      success: true,
      locations
    });

  } catch (error) {
    console.error('Error fetching project locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project locations'
    });
  }
});

// Get barangay statistics
router.get('/barangay-stats', async (req, res) => {
  try {
    const barangays = [
      'Alipit', 'Bagumbayan', 'Bubukal', 'Calios', 'Duhat', 'Gatid', 'Jasaan', 
      'Labuin', 'Malinao', 'Oogong', 'Pagsawitan', 'Palasan', 'Patimbao', 
      'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V',
      'San Jose', 'San Juan', 'San Pablo Norte', 'San Pablo Sur', 'Santisima Cruz',
      'Santo Angel Central', 'Santo Angel Norte', 'Santo Angel Sur'
    ];

    const barangayStats = [];

    for (const barangay of barangays) {
      const projects = await Project.count({
        where: {
          location: {
            [Op.like]: `%${barangay}%`
          },
          status: {
            [Op.ne]: 'deleted'
          }
        }
      });

      const ongoingProjects = await Project.count({
        where: {
          location: {
            [Op.like]: `%${barangay}%`
          },
          status: {
            [Op.in]: ['ongoing', 'delayed']
          }
        }
      });

      const completedProjects = await Project.count({
        where: {
          location: {
            [Op.like]: `%${barangay}%`
          },
          status: 'completed'
        }
      });

      const totalBudget = await Project.sum('totalBudget', {
        where: {
          location: {
            [Op.like]: `%${barangay}%`
          },
          status: {
            [Op.ne]: 'deleted'
          }
        }
      });

      barangayStats.push({
        name: barangay,
        totalProjects: projects,
        ongoingProjects,
        completedProjects,
        totalBudget: totalBudget || 0
      });
    }

    res.json({
      success: true,
      barangayStats
    });

  } catch (error) {
    console.error('Error fetching barangay stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch barangay statistics'
    });
  }
});

// Get Facebook posts from Mayor's official page
router.get('/facebook-posts', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Facebook Graph API configuration
    const FACEBOOK_PAGE_ID = 'newandyoung2022'; // The page username
    const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN; // You'll need to set this in your environment
    
    // Try to fetch real Facebook data first, even without token (public posts)
    let useRealData = true;
    
    if (!FACEBOOK_ACCESS_TOKEN) {
      console.log('No Facebook access token found. Attempting to fetch public posts...');
      // We'll try without token first for public posts
    }
    
    // Try to fetch real Facebook data first
    let facebookData = null;
    let facebookError = null;
    
    try {
      // First try with access token if available
      if (FACEBOOK_ACCESS_TOKEN) {
        console.log('Using Facebook access token for API calls');
        const facebookUrl = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/posts`;
        const params = new URLSearchParams({
          access_token: FACEBOOK_ACCESS_TOKEN,
          fields: 'id,message,created_time,full_picture,attachments{media{image{src},video{source,thumbnail_url}},subattachments{media{image{src},video{source,thumbnail_url}}}},permalink_url,reactions.summary(total_count),comments.summary(total_count),shares,type,is_video',
          limit: parseInt(limit)
        });
        
        const response = await fetch(`${facebookUrl}?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          facebookData = data;
          console.log('Successfully fetched Facebook data with access token');
        } else {
          facebookError = data.error?.message || 'Failed to fetch Facebook posts';
          console.log('Facebook API error with token:', facebookError);
        }
      } else {
        // Try without access token for public posts (this usually doesn't work but worth trying)
        console.log('Attempting to fetch public Facebook posts without access token...');
        const facebookUrl = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/posts`;
        const params = new URLSearchParams({
          fields: 'id,message,created_time,full_picture,permalink_url',
          limit: parseInt(limit)
        });
        
        const response = await fetch(`${facebookUrl}?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          facebookData = data;
          console.log('Successfully fetched public Facebook data');
        } else {
          facebookError = data.error?.message || 'Failed to fetch public Facebook posts';
          console.log('Facebook API error without token:', facebookError);
        }
      }
    } catch (error) {
      facebookError = error.message;
      console.log('Facebook API request failed:', facebookError);
    }
    
    // Log what we're doing
    console.log('Facebook data available:', !!facebookData);
    console.log('Facebook error:', facebookError);
    
    // If we have real Facebook data, use it
    if (facebookData && facebookData.data && facebookData.data.length > 0) {
      console.log(`Processing ${facebookData.data.length} real Facebook posts`);
      
      // Format posts for frontend with enhanced media support and timestamps
      const formattedPosts = facebookData.data.map(post => {
      // Extract media from attachments with priority order
      let mediaUrl = post.full_picture;
      let mediaType = 'image';
      let isVideo = post.is_video || false;
      
      // Check attachments for media
      if (post.attachments?.data?.[0]) {
        const attachment = post.attachments.data[0];
        
        // Check for video first
        if (attachment.media?.video) {
          mediaUrl = attachment.media.video.thumbnail_url || attachment.media.video.source || post.full_picture;
          mediaType = 'video';
          isVideo = true;
        }
        // Check for image
        else if (attachment.media?.image?.src) {
          mediaUrl = attachment.media.image.src;
          mediaType = 'image';
        }
        // Check subattachments (for carousel posts)
        else if (attachment.subattachments?.data?.[0]) {
          const subAttachment = attachment.subattachments.data[0];
          if (subAttachment.media?.video) {
            mediaUrl = subAttachment.media.video.thumbnail_url || subAttachment.media.video.source || post.full_picture;
            mediaType = 'video';
            isVideo = true;
          } else if (subAttachment.media?.image?.src) {
            mediaUrl = subAttachment.media.image.src;
            mediaType = 'image';
          }
        }
      }
      
      // Format timestamps
      const createdDate = new Date(post.created_time);
      const now = new Date();
      const diffInMs = now - createdDate;
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInHours / 24);
      
      // Format absolute date
      const absoluteDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Format relative time
      let relativeTime;
      if (diffInHours < 1) {
        relativeTime = 'Just now';
      } else if (diffInHours < 24) {
        relativeTime = `${diffInHours}h ago`;
      } else if (diffInDays < 7) {
        relativeTime = `${diffInDays}d ago`;
      } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        relativeTime = `${weeks}w ago`;
      } else {
        const months = Math.floor(diffInDays / 30);
        relativeTime = `${months}mo ago`;
      }
      
      return {
        id: post.id,
        message: post.message || '',
        created_time: post.created_time,
        iso_date: post.created_time,
        formatted_date: absoluteDate,
        relative_time: relativeTime,
        full_picture: mediaUrl,
        thumbnail_url: mediaUrl,
        media_type: mediaType,
        is_video: isVideo,
        permalink_url: post.permalink_url,
        reactions: post.reactions?.summary || { total_count: 0 },
        comments: post.comments?.summary || { total_count: 0 },
        shares: post.shares || { count: 0 },
        post_type: post.type || 'status'
      };
    });
    
      res.json({
        success: true,
        posts: formattedPosts,
        source: 'facebook',
        total_posts: formattedPosts.length
      });
      
    } else {
      // Fall back to mock data only if Facebook API completely fails
      console.log('No real Facebook data available, using mock data as fallback');
      console.log('Facebook error:', facebookError);
      
      const now = new Date();
      const mockPosts = [
        {
          id: 'mock-1',
          message: 'Panalangin para sa ating bayan...',
          created_time: now.toISOString(),
          iso_date: now.toISOString(),
          formatted_date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          relative_time: 'Just now',
          full_picture: null,
          thumbnail_url: null,
          media_type: 'image',
          is_video: false,
          permalink_url: 'https://facebook.com/newandyoung2022',
          reactions: { total_count: 560 },
          comments: { total_count: 165 },
          shares: { count: 31 },
          post_type: 'status'
        },
        {
          id: 'mock-2', 
          message: 'Mga kababayan, patuloy nating pinapalakas ang ating bayan sa pamamagitan ng mga proyektong pang-komunidad.',
          created_time: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
          iso_date: new Date(now.getTime() - 86400000).toISOString(),
          formatted_date: new Date(now.getTime() - 86400000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          relative_time: '1d ago',
          full_picture: null,
          thumbnail_url: null,
          media_type: 'image',
          is_video: false,
          permalink_url: 'https://facebook.com/newandyoung2022',
          reactions: { total_count: 234 },
          comments: { total_count: 45 },
          shares: { count: 12 },
          post_type: 'status'
        },
        {
          id: 'mock-3',
          message: 'Maraming salamat sa lahat ng mga kababayan na sumusuporta sa ating mga programa.',
          created_time: new Date(now.getTime() - 172800000).toISOString(), // 2 days ago
          iso_date: new Date(now.getTime() - 172800000).toISOString(),
          formatted_date: new Date(now.getTime() - 172800000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          relative_time: '2d ago',
          full_picture: null,
          thumbnail_url: null,
          media_type: 'image',
          is_video: false,
          permalink_url: 'https://facebook.com/newandyoung2022',
          reactions: { total_count: 189 },
          comments: { total_count: 23 },
          shares: { count: 8 },
          post_type: 'status'
        },
        {
          id: 'mock-4',
          message: 'Isang taos-pusong pagbati kay John Mervin Matienzo sa kanyang kahanga-hangang pagkapanalo bilang Silver Medalist sa Seni Bebasi (Solo Creative) Category sa 3rd Junior Asian Pencak Silat Championship na ginanap mula September 24-30, 2025 sa Srinagar City, Jammu & Kashmir States, India.',
          created_time: new Date(now.getTime() - 259200000).toISOString(), // 3 days ago
          iso_date: new Date(now.getTime() - 259200000).toISOString(),
          formatted_date: new Date(now.getTime() - 259200000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          relative_time: '3d ago',
          full_picture: null,
          thumbnail_url: null,
          media_type: 'image',
          is_video: false,
          permalink_url: 'https://facebook.com/newandyoung2022',
          reactions: { total_count: 1200 },
          comments: { total_count: 111 },
          shares: { count: 16 },
          post_type: 'photo'
        },
        {
          id: 'mock-5',
          message: 'PROUD MOMENT FOR OUR TOWN! Congratulations to our local athletes for their outstanding performance in the regional sports competition.',
          created_time: new Date(now.getTime() - 345600000).toISOString(), // 4 days ago
          iso_date: new Date(now.getTime() - 345600000).toISOString(),
          formatted_date: new Date(now.getTime() - 345600000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          relative_time: '4d ago',
          full_picture: null,
          thumbnail_url: null,
          media_type: 'video',
          is_video: true,
          permalink_url: 'https://facebook.com/newandyoung2022',
          reactions: { total_count: 890 },
          comments: { total_count: 67 },
          shares: { count: 24 },
          post_type: 'video'
        }
      ];
      
      res.json({
        success: true,
        posts: mockPosts.slice(0, parseInt(limit)),
        source: 'mock',
        error: facebookError,
        note: 'Using mock data - Facebook API not accessible'
      });
    }
    
  } catch (error) {
    console.error('Error fetching Facebook posts:', error);
    
    // Return mock data as fallback
    const now = new Date();
    const mockPosts = [
      {
        id: 'fallback-1',
        message: 'Panalangin para sa ating bayan...',
        created_time: now.toISOString(),
        iso_date: now.toISOString(),
        formatted_date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        relative_time: 'Just now',
        full_picture: null,
        thumbnail_url: null,
        media_type: 'image',
        is_video: false,
        permalink_url: 'https://facebook.com/newandyoung2022',
        reactions: { total_count: 560 },
        comments: { total_count: 165 },
        shares: { count: 31 },
        post_type: 'status'
      }
    ];
    
    res.json({
      success: true,
      posts: mockPosts.slice(0, parseInt(req.query.limit || 5)),
      source: 'fallback',
      error: error.message
    });
  }
});

module.exports = router; 