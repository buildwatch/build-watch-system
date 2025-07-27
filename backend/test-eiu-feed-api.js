const { User, sequelize } = require('./models');

async function testEIUFeedAPI() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Get the Municipal Engineer Office user
    const meoUser = await User.findOne({
      where: { 
        username: 'meoadmin@gmail.com',
        role: 'LGU-IU'
      }
    });

    if (!meoUser) {
      console.log('❌ Municipal Engineer Office user not found!');
      return;
    }

    console.log(`\n👤 TESTING WITH USER:`);
    console.log(`Name: ${meoUser.name}`);
    console.log(`Username: ${meoUser.username}`);
    console.log(`Role: ${meoUser.role}`);
    console.log(`ID: ${meoUser.id}`);

    // Test the EIU Activity Feed query
    console.log('\n🧪 TESTING EIU ACTIVITY FEED QUERY:');
    console.log('='.repeat(80));
    
    const { EIUActivity, Project } = require('./models');
    
    // This is exactly what the frontend calls: GET /api/eiu-activities
    const activities = await EIUActivity.findAndCountAll({
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'location', 'implementingOfficeId'],
          where: {
            implementingOfficeId: meoUser.id // This should match the user's ID
          }
        },
        {
          model: User,
          as: 'eiuUser',
          attributes: ['id', 'name', 'username', 'department']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['activityDate', 'DESC'], ['createdAt', 'DESC']]
    });

    console.log(`\n📊 API RESPONSE:`);
    console.log(`Total activities found: ${activities.count}`);
    console.log(`Activities array length: ${activities.rows.length}`);

    if (activities.rows.length > 0) {
      console.log('\n📋 ACTIVITIES:');
      activities.rows.forEach((activity, index) => {
        console.log(`\n${index + 1}. Activity: ${activity.title}`);
        console.log(`   Project: ${activity.project?.name}`);
        console.log(`   EIU User: ${activity.eiuUser?.name}`);
        console.log(`   Status: ${activity.status} | Review: ${activity.reviewStatus}`);
        console.log(`   Created: ${activity.createdAt}`);
      });
    } else {
      console.log('\n❌ NO ACTIVITIES FOUND!');
    }

    // Calculate statistics like the API does
    console.log('\n📈 CALCULATING STATISTICS:');
    console.log('='.repeat(80));
    
    // Use the new statistics query format
    const statsQuery = await EIUActivity.sequelize.query(`
      SELECT 
        COUNT(*) as totalActivities,
        COUNT(CASE WHEN DATE(activityDate) = CURDATE() THEN 1 END) as todayActivities,
        COUNT(CASE WHEN reviewStatus = 'pending_review' THEN 1 END) as pendingReviews,
        COUNT(CASE WHEN reviewStatus = 'approved' THEN 1 END) as completedReviews
      FROM eiu_activities ea
      INNER JOIN projects p ON ea.projectId = p.id
      WHERE p.implementingOfficeId = :implementingOfficeId
    `, {
      replacements: { implementingOfficeId: meoUser.id },
      type: EIUActivity.sequelize.QueryTypes.SELECT
    });

    const stats = statsQuery[0] || {};

    console.log('Statistics:', {
      totalActivities: parseInt(stats.totalActivities || 0),
      todayActivities: parseInt(stats.todayActivities || 0),
      pendingReviews: parseInt(stats.pendingReviews || 0),
      completedReviews: parseInt(stats.completedReviews || 0)
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testEIUFeedAPI(); 