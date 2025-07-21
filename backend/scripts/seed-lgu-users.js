const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const db = require('../models');

// LGU User Account Definitions
const LGU_USERS = [
  // ===== LGU-PMT (MPMEC) =====
  {
    name: 'Engr. PABLO M. MAGPILY, Jr.',
    username: 'pablo.magpily',
    email: 'pablo.magpily@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Chair',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-001',
    group: 'MPMEC',
    department: 'Municipal Engineering Office (MEO)',
    position: 'Municipal Engineer',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL', // Can access all projects
    status: 'active'
  },
  {
    name: 'EnP. JOSHUA FEDERICK J. VITALIZ, DLUP',
    username: 'joshua.vitaliz',
    email: 'joshua.vitaliz@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Vice Chair',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-002',
    group: 'MPMEC',
    department: 'Municipal Disaster Risk Reduction and Management Office (MDRRMO)',
    position: 'MDRRMO Head',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL', // Can access all projects
    status: 'active'
  },
  {
    name: 'Engr. TIRSO ALVIN LAVIÑA III',
    username: 'tirso.lavina',
    email: 'tirso.lavina@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Member',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-003',
    group: 'MPMEC',
    department: 'Municipal Local Government Operations Office (MLGOO)',
    position: 'MLGOO',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'MLGOO', // Department-specific access
    status: 'active'
  },
  {
    name: 'Hon. LAURA P. OBLIGACION',
    username: 'laura.obligacion',
    email: 'laura.obligacion@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Member',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-004',
    group: 'MPMEC',
    department: 'Association of Barangay Captains (ABC)',
    position: 'ABC President',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ABC', // Department-specific access
    status: 'active'
  },
  {
    name: 'LYENIELLYN D. OARDE, RSW',
    username: 'lyenielyn.oarde',
    email: 'lyenielyn.oarde@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Member',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-005',
    group: 'MPMEC',
    department: 'Municipal Social Welfare and Development Office (MSWDO)',
    position: 'MSWDO Head',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'MSWDO', // Department-specific access
    status: 'active'
  },
  {
    name: 'Engr. ROSALY M. GUTIERREZ, EnP.',
    username: 'rosaly.gutierrez',
    email: 'rosaly.gutierrez@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Secretariat Chair',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-006',
    group: 'MPMEC Secretariat',
    department: 'Municipal Planning and Development Office (MPDC)',
    position: 'MPDC Head',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL', // Can access all projects
    status: 'active'
  },
  {
    name: 'CHRISTIAN M. GUANZON',
    username: 'christian.guanzon',
    email: 'christian.guanzon@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Secretariat Focal Person',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-007',
    group: 'MPMEC Secretariat',
    department: 'Municipal Planning and Development Office (MPDC)',
    position: 'MPDO Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL', // Can access all projects
    status: 'active'
  },

  // ===== EIU (External Implementing Unit) =====
  {
    name: 'Engr. MARIA SANTOS',
    username: 'maria.santos',
    email: 'maria.santos@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Manager',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-001',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Manager',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'SOLAR_STREETLIGHTS',
    assignedProject: 'Installation of Solar and LED Streetlights',
    status: 'active'
  },
  {
    name: 'Engr. JUAN DELA CRUZ',
    username: 'juan.delacruz',
    email: 'juan.delacruz@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-002',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'ELEVATED_ROAD',
    assignedProject: 'Elevated Road (Brgy. Sto. Angel Central)',
    status: 'active'
  },
  {
    name: 'Engr. PEDRO MARTINEZ',
    username: 'pedro.martinez',
    email: 'pedro.martinez@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-003',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'FARM_TO_MARKET_ROAD',
    assignedProject: 'Farm-to-Market Road (Sitio Antipolo, Brgy. Labuin)',
    status: 'active'
  },
  {
    name: 'Ms. ANA REYES',
    username: 'ana.reyes',
    email: 'ana.reyes@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-004',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'GARBAGE_TRUCK',
    assignedProject: 'Garbage Truck Procurement',
    status: 'active'
  },
  {
    name: 'Ms. LUCIA GONZALES',
    username: 'lucia.gonzales',
    email: 'lucia.gonzales@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-005',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'SOCIAL_PENSION',
    assignedProject: 'Social Pension Program',
    status: 'active'
  },
  {
    name: 'Mr. CARLOS LOPEZ',
    username: 'carlos.lopez',
    email: 'carlos.lopez@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-006',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'PANTAWID_PAMILYA',
    assignedProject: 'Pantawid Pamilyang Pilipino Program',
    status: 'active'
  },
  {
    name: 'Ms. ELENA TORRES',
    username: 'elena.torres',
    email: 'elena.torres@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-007',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'LIFE_REWARD_GRANTS',
    assignedProject: 'Life Reward Grants for Senior Citizens',
    status: 'active'
  },
  {
    name: 'Mr. ANTONIO SILVA',
    username: 'antonio.silva',
    email: 'antonio.silva@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-008',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'LIVELIHOOD_RICE',
    assignedProject: 'Livelihood Program – Rice Retailing',
    status: 'active'
  },
  {
    name: 'Engr. ROBERTO MENDES',
    username: 'roberto.mendes',
    email: 'roberto.mendes@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-009',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'SECURITY_CAMERAS',
    assignedProject: 'Installation of Disaster Area Security Cameras',
    status: 'active'
  },

  // ===== LGU-IU (Internal Units) =====
  {
    name: 'Hon. MAYOR ANTONIO REYES',
    username: 'mayor.reyes',
    email: 'mayor.reyes@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'MDC Chair',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-001',
    group: 'MDC',
    department: 'Municipal Development Council (MDC)',
    position: 'Municipal Mayor',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'Municipal Hall, Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },
  {
    name: 'Ms. ISABEL CRUZ',
    username: 'isabel.cruz',
    email: 'isabel.cruz@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Oversight Officer',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-002',
    group: 'Oversight',
    department: 'Municipal Planning and Development Office (MPDC)',
    position: 'Oversight Officer',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'Municipal Hall, Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },
  {
    name: 'Engr. MANUEL SANTOS',
    username: 'manuel.santos',
    email: 'manuel.santos@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-003',
    group: 'MEO',
    department: 'Municipal Engineering Office (MEO)',
    position: 'Engineer',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'MEO Office, Santa Cruz, Laguna',
    projectAccess: 'MEO',
    status: 'active'
  },
  {
    name: 'Ms. CARMEN VILLANUEVA',
    username: 'carmen.villanueva',
    email: 'carmen.villanueva@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-004',
    group: 'MENRO',
    department: 'Municipal Environment and Natural Resources Office (MENRO)',
    position: 'Environment Officer',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'MENRO Office, Santa Cruz, Laguna',
    projectAccess: 'MENRO',
    status: 'active'
  },
  {
    name: 'Mr. FERNANDO AQUINO',
    username: 'fernando.aquino',
    email: 'fernando.aquino@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-005',
    group: 'OMAg',
    department: 'Office of the Municipal Agriculturist (OMAg)',
    position: 'Agricultural Officer',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'OMAg Office, Santa Cruz, Laguna',
    projectAccess: 'OMAg',
    status: 'active'
  },
  {
    name: 'Ms. ROSARIO MENDOZA',
    username: 'rosario.mendoza',
    email: 'rosario.mendoza@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-006',
    group: 'MSWDO',
    department: 'Municipal Social Welfare and Development Office (MSWDO)',
    position: 'Social Worker',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'MSWDO Office, Santa Cruz, Laguna',
    projectAccess: 'MSWDO',
    status: 'active'
  },
  {
    name: 'Mr. RICARDO FLORES',
    username: 'ricardo.flores',
    email: 'ricardo.flores@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-007',
    group: 'MDRRMO',
    department: 'Municipal Disaster Risk Reduction and Management Office (MDRRMO)',
    position: 'DRRM Officer',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'MDRRMO Office, Santa Cruz, Laguna',
    projectAccess: 'MDRRMO',
    status: 'active'
  },

  // ===== EMS (External Monitoring Stakeholders) =====
  {
    name: 'Ms. GABRIELA SANTOS',
    username: 'gabriela.santos',
    email: 'gabriela.santos@ngo.org.ph',
    password: 'BuildWatch2025!',
    role: 'EMS',
    subRole: 'NGO Representative',
    idType: 'NGO ID',
    idNumber: 'EMS-001',
    group: 'NGO',
    department: 'Non-Government Organization',
    position: 'NGO Representative',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'NGO Office, Santa Cruz, Laguna',
    projectAccess: 'VIEW_ONLY',
    status: 'active'
  },
  {
    name: 'Mr. DOMINGO CRUZ',
    username: 'domingo.cruz',
    email: 'domingo.cruz@cso.org.ph',
    password: 'BuildWatch2025!',
    role: 'EMS',
    subRole: 'CSO Member',
    idType: 'CSO ID',
    idNumber: 'EMS-002',
    group: 'CSO',
    department: 'Civil Society Organization',
    position: 'CSO Representative',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'CSO Office, Santa Cruz, Laguna',
    projectAccess: 'VIEW_ONLY',
    status: 'active'
  },
  {
    name: 'Ms. LUCIA REYES',
    username: 'lucia.reyes',
    email: 'lucia.reyes@ppmc.org.ph',
    password: 'BuildWatch2025!',
    role: 'EMS',
    subRole: 'PPMC Representative',
    idType: 'PPMC ID',
    idNumber: 'EMS-003',
    group: 'PPMC',
    department: 'Provincial Project Monitoring Committee',
    position: 'PPMC Representative',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'PPMC Office, Santa Cruz, Laguna',
    projectAccess: 'VIEW_ONLY',
    status: 'active'
  },

  // ===== SYS.AD (System Oversight and Admin) =====
  {
    name: 'Executive Viewer',
    username: 'executive.viewer',
    email: 'executive.viewer@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'SYS.AD',
    subRole: 'Executive',
    idType: 'LGU Personnel ID',
    idNumber: 'SYS.AD-002',
    group: 'Executive',
    department: 'Municipal Executive Office',
    position: 'Executive Viewer',
    contactNumber: '+63-XXX-XXX-XXXX',
    address: 'Municipal Hall, Santa Cruz, Laguna',
    projectAccess: 'VIEW_ALL',
    status: 'active'
  }
];

async function seedLGUUsers() {
  try {
    console.log('🌱 Seeding LGU User Accounts...');
    console.log('='.repeat(60));

    const results = [];
    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of LGU_USERS) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          where: { 
            username: userData.username 
          }
        });

        if (existingUser) {
          console.log(`⚠️  User ${userData.username} already exists - skipping`);
          skippedCount++;
          results.push({
            username: userData.username,
            status: 'SKIPPED',
            details: 'User already exists'
          });
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create user
        const user = await User.create({
          name: userData.name,
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          subRole: userData.subRole,
          idType: userData.idType,
          idNumber: userData.idNumber,
          group: userData.group,
          department: userData.department,
          position: userData.position,
          contactNumber: userData.contactNumber,
          address: userData.address,
          status: userData.status
        });

        // Log activity
        await ActivityLog.create({
          userId: user.id,
          action: 'CREATE_LGU_USER',
          entityType: 'User',
          entityId: user.id,
          details: `Created LGU user: ${user.name} (${user.role}/${user.subRole}) - ${user.department}`,
          ipAddress: '127.0.0.1',
          userAgent: 'LGU User Seeding Script'
        });

        console.log(`✅ Created: ${user.name} (${user.role}/${user.subRole})`);
        createdCount++;
        results.push({
          username: userData.username,
          status: 'CREATED',
          details: `${userData.role}/${userData.subRole} - ${userData.department}`
        });

      } catch (error) {
        console.error(`❌ Failed to create ${userData.username}:`, error.message);
        results.push({
          username: userData.username,
          status: 'FAILED',
          details: error.message
        });
      }
    }

    // Generate summary report
    console.log('\n📊 LGU User Seeding Summary');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${createdCount} users`);
    console.log(`⚠️  Skipped: ${skippedCount} users (already exist)`);
    console.log(`📊 Total Processed: ${LGU_USERS.length} users`);

    console.log('\n👥 User Groups Created:');
    const groupStats = {};
    results.forEach(result => {
      if (result.status === 'CREATED') {
        const userData = LGU_USERS.find(u => u.username === result.username);
        if (userData) {
          groupStats[userData.role] = (groupStats[userData.role] || 0) + 1;
        }
      }
    });

    Object.entries(groupStats).forEach(([group, count]) => {
      console.log(`   ${group}: ${count} users`);
    });

    console.log('\n🔐 Default Login Credentials:');
    console.log('   Username: [username from list above]');
    console.log('   Password: BuildWatch2025!');
    console.log('\n⚠️  IMPORTANT: Users must change password on first login!');

    console.log('\n🎯 Access Control Summary:');
    console.log('   • LGU-PMT: Can access RPMES Forms 5-11, all projects (leadership)');
    console.log('   • EIU: Can access assigned projects only');
    console.log('   • LGU-IU: Can access RPMES Forms 1-4, department projects');
    console.log('   • EMS: View-only access, can submit observations');
    console.log('   • SYS.AD: Full system access, user management');

    return results;

  } catch (error) {
    console.error('💥 LGU user seeding failed:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  seedLGUUsers()
    .then(() => {
      console.log('\n🎉 LGU user seeding completed successfully!');
      console.log('🚀 System ready for UAT and LGU deployment!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 LGU user seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedLGUUsers, LGU_USERS }; 