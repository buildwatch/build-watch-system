const { User, Project } = require('../models');
const sequelize = require('../models').sequelize;

async function fixEIUUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Find all EIU users
    const eiuUsers = await User.findAll({
      where: {
        role: 'eiu'
      }
    });

    console.log(`\n👥 Found ${eiuUsers.length} EIU users:`);
    
    eiuUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.username})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   SubRole: ${user.subRole}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Email: ${user.email}`);
    });

    // Check if any EIU users are inactive
    const inactiveUsers = eiuUsers.filter(user => user.status !== 'Active');
    
    if (inactiveUsers.length > 0) {
      console.log(`\n⚠️ Found ${inactiveUsers.length} inactive EIU users. Activating them...`);
      
      for (const user of inactiveUsers) {
        await user.update({ status: 'Active' });
        console.log(`✅ Activated user: ${user.name}`);
      }
    } else {
      console.log('\n✅ All EIU users are already active');
    }

    // Check projects assigned to EIU users
    const projectsWithEIU = await Project.findAll({
      where: {
        eiuPersonnelId: {
          [require('sequelize').Op.not]: null
        }
      },
      include: [
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'username', 'role', 'status']
        }
      ]
    });

    console.log(`\n📊 Projects with EIU personnel: ${projectsWithEIU.length}`);
    
    projectsWithEIU.forEach((project, index) => {
      console.log(`\n${index + 1}. ${project.name}`);
      console.log(`   EIU Personnel: ${project.eiuPersonnel?.name || 'None'} (${project.eiuPersonnel?.status || 'Unknown'})`);
      console.log(`   EIU User ID: ${project.eiuPersonnelId}`);
    });

    // Verify that all EIU users have valid IDs
    const validEIUUserIds = eiuUsers.map(user => user.id);
    const projectsWithInvalidEIU = projectsWithEIU.filter(project => 
      !validEIUUserIds.includes(project.eiuPersonnelId)
    );

    if (projectsWithInvalidEIU.length > 0) {
      console.log(`\n⚠️ Found ${projectsWithInvalidEIU.length} projects with invalid EIU personnel IDs`);
      projectsWithInvalidEIU.forEach(project => {
        console.log(`   Project: ${project.name} - Invalid EIU ID: ${project.eiuPersonnelId}`);
      });
    } else {
      console.log('\n✅ All projects have valid EIU personnel IDs');
    }

    console.log('\n✅ EIU user check completed');

  } catch (error) {
    console.error('❌ Error fixing EIU users:', error);
  } finally {
    await sequelize.close();
  }
}

fixEIUUsers(); 