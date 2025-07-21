const { Department, Group, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function seedDepartmentsAndGroups() {
  try {
    console.log('Starting to seed departments and groups...');

    // Create departments
    const departments = [
      {
        id: uuidv4(),
        name: 'Municipal Agriculturist\'s Office',
        code: 'MAO',
        description: 'Handles agricultural programs and services for the municipality',
        head: 'Municipal Agriculturist',
        contactNumber: '+63 912 345 6789',
        email: 'mao@santacruz.gov.ph',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'Municipal General Services Office',
        code: 'MGSO',
        description: 'Provides general services and maintenance for municipal facilities',
        head: 'Municipal General Services Officer',
        contactNumber: '+63 912 345 6790',
        email: 'mgso@santacruz.gov.ph',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'Municipal Social Welfare and Development Office',
        code: 'MSWDO',
        description: 'Implements social welfare and development programs',
        head: 'Municipal Social Welfare and Development Officer',
        contactNumber: '+63 912 345 6791',
        email: 'mswdo@santacruz.gov.ph',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'Municipal Disaster and Risk Reduction Management Office',
        code: 'MDRRMO',
        description: 'Coordinates disaster preparedness and response activities',
        head: 'Municipal Disaster and Risk Reduction Management Officer',
        contactNumber: '+63 912 345 6792',
        email: 'mdrrmo@santacruz.gov.ph',
        status: 'active'
      }
    ];

    // Create groups
    const groups = [
      {
        id: uuidv4(),
        name: 'LGU-PMT',
        code: 'LGU-PMT',
        description: 'Local Government Unit Project Management Team',
        leader: 'LGU-PMT Head',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'MPMEC',
        code: 'MPMEC',
        description: 'Municipal Project Monitoring and Evaluation Committee',
        leader: 'MPMEC Chairperson',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'MPMEC Secretariat',
        code: 'MPMEC-SEC',
        description: 'Secretariat support for MPMEC operations',
        leader: 'MPMEC Secretariat Head',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'LGU-IU',
        code: 'LGU-IU',
        description: 'Local Government Unit Implementing Unit',
        leader: 'LGU-IU Head',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'Implementing Office-Officer',
        code: 'IO-OFFICER',
        description: 'Officers from implementing offices',
        leader: 'Implementing Office Coordinator',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'MDC Personnel',
        code: 'MDC-PERSONNEL',
        description: 'Municipal Development Council Personnel',
        leader: 'MDC Coordinator',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'LGU Oversight Officer',
        code: 'LGU-OVERSIGHT',
        description: 'Oversight officers for LGU projects',
        leader: 'LGU Oversight Coordinator',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'EIU',
        code: 'EIU',
        description: 'External Implementing Unit',
        leader: 'EIU Head',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'None',
        code: 'NONE',
        description: 'No specific group assignment',
        leader: 'System Administrator',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'EMS',
        code: 'EMS',
        description: 'Environmental Management System',
        leader: 'EMS Coordinator',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'NGO / CSO Partner',
        code: 'NGO-CSO',
        description: 'Non-Government Organization / Civil Society Organization Partners',
        leader: 'NGO/CSO Coordinator',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'PPMC Representative',
        code: 'PPMC-REP',
        description: 'Provincial Project Monitoring Committee Representatives',
        leader: 'PPMC Representative Head',
        status: 'active'
      }
    ];

    // Insert departments
    console.log('Creating departments...');
    for (const dept of departments) {
      await Department.create(dept);
      console.log(`Created department: ${dept.name}`);
    }

    // Insert groups
    console.log('Creating groups...');
    for (const group of groups) {
      await Group.create(group);
      console.log(`Created group: ${group.name}`);
    }

    // Update existing users to assign them to appropriate groups
    console.log('Updating existing users with group assignments...');
    
    // Get all users except system admin
    const users = await User.findAll({
      where: {
        role: { [require('sequelize').Op.ne]: 'SYS.AD' },
        status: { [require('sequelize').Op.ne]: 'deleted' }
      }
    });

    // Get the groups we just created
    const createdGroups = await Group.findAll();
    const groupMap = {};
    createdGroups.forEach(group => {
      groupMap[group.name] = group.id;
    });

    // Assign users to groups based on their roles
    for (const user of users) {
      let groupName = null;
      
      // Assign based on role
      switch (user.role) {
        case 'LGU-PMT':
          groupName = 'LGU-PMT';
          break;
        case 'EIU':
          groupName = 'EIU';
          break;
        case 'EMS':
          groupName = 'EMS';
          break;
        case 'LGU-IU':
          groupName = 'LGU-IU';
          break;
        case 'EXEC':
          groupName = 'MPMEC';
          break;
        default:
          groupName = 'None';
      }

      if (groupName) {
        await user.update({ group: groupName });
        console.log(`Assigned user ${user.name} to group ${groupName}`);
      }
    }

    // Get department and group statistics
    console.log('\nDepartment and Group Statistics:');
    
    // Count users by department (using the department field in User model)
    const deptStats = await User.findAll({
      where: { 
        status: { [require('sequelize').Op.ne]: 'deleted' },
        department: { [require('sequelize').Op.ne]: null }
      },
      attributes: [
        'department',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'userCount']
      ],
      group: ['department']
    });

    console.log('\nDepartment User Counts:');
    for (const stat of deptStats) {
      console.log(`${stat.department}: ${stat.dataValues.userCount} users`);
    }

    // Count users by group (using the group field in User model)
    const groupStats = await User.findAll({
      where: { 
        status: { [require('sequelize').Op.ne]: 'deleted' },
        group: { [require('sequelize').Op.ne]: null }
      },
      attributes: [
        'group',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'userCount']
      ],
      group: ['group']
    });

    console.log('\nGroup User Counts:');
    for (const stat of groupStats) {
      console.log(`${stat.group}: ${stat.dataValues.userCount} users`);
    }

    console.log('\nSeeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding departments and groups:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDepartmentsAndGroups(); 