const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create timestamped log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `user-seeding-${timestamp}.txt`);
const latestLogFile = path.join(logsDir, 'user-seeding-latest.txt');

function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
  fs.appendFileSync(latestLogFile, logMessage);
}

// Helper function to add delay between operations
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Complete LGU User Accounts with FIXED validation issues
const LGU_USERS = [
  // ===== LGU-PMT (MPMEC) =====
  {
    name: 'Engr. PABLO M. MAGPILY, Jr.',
    username: 'pablo_magpily',
    email: 'pablo.magpily@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Chair',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-001',
    group: 'MPMEC',
    department: 'Municipal Engineering Office (MEO)',
    position: 'Municipal Engineer',
    contactNumber: '+63-912-345-6789',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },
  {
    name: 'EnP. JOSHUA FEDERICK J. VITALIZ, DLUP',
    username: 'joshua_vitaliz',
    email: 'joshua.vitaliz@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Vice Chair',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-002',
    group: 'MPMEC',
    department: 'Municipal Disaster Risk Reduction and Management Office (MDRRMO)',
    position: 'MDRRMO Head',
    contactNumber: '+63-923-456-7890',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },
  {
    name: 'Engr. TIRSO ALVIN LAVIÑA III',
    username: 'tirso_lavina',
    email: 'tirso.lavina@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Member',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-003',
    group: 'MPMEC',
    department: 'Municipal Local Government Operations Office (MLGOO)',
    position: 'MLGOO',
    contactNumber: '+63-934-567-8901',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'MLGOO',
    status: 'active'
  },
  {
    name: 'Hon. LAURA P. OBLIGACION',
    username: 'laura_obligacion',
    email: 'laura.obligacion@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Member',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-004',
    group: 'MPMEC',
    department: 'Association of Barangay Captains (ABC)',
    position: 'ABC President',
    contactNumber: '+63-945-678-9012',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ABC',
    status: 'active'
  },
  {
    name: 'LYENIELLYN D. OARDE, RSW',
    username: 'lyenielyn_oarde',
    email: 'lyenielyn.oarde@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Member',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-005',
    group: 'MPMEC',
    department: 'Municipal Social Welfare and Development Office (MSWDO)',
    position: 'MSWDO Head',
    contactNumber: '+63-956-789-0123',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'MSWDO',
    status: 'active'
  },
  {
    name: 'Engr. ROSALY M. GUTIERREZ, EnP.',
    username: 'rosaly_gutierrez',
    email: 'rosaly.gutierrez@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Secretariat Chair',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-006',
    group: 'MPMEC Secretariat',
    department: 'Municipal Planning and Development Office (MPDC)',
    position: 'MPDC Head',
    contactNumber: '+63-967-890-1234',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },
  {
    name: 'CHRISTIAN M. GUANZON',
    username: 'christian_guanzon',
    email: 'christian.guanzon@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Secretariat Focal Person',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-007',
    group: 'MPMEC Secretariat',
    department: 'Municipal Planning and Development Office (MPDC)',
    position: 'MPDO Staff',
    contactNumber: '+63-978-901-2345',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },

  // ===== EIU (External Implementing Unit) =====
  {
    name: 'Engr. MARIA SANTOS',
    username: 'maria_santos',
    email: 'maria.santos@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Manager',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-001',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Manager',
    contactNumber: '+63-989-012-3456',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'SOLAR_STREETLIGHTS',
    assignedProject: 'Installation of Solar and LED Streetlights',
    status: 'active'
  },
  {
    name: 'Engr. JUAN DELA CRUZ',
    username: 'juan_delacruz',
    email: 'juan.delacruz@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-002',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-990-123-4567',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'ELEVATED_ROAD',
    assignedProject: 'Elevated Road (Brgy. Sto. Angel Central)',
    status: 'active'
  },
  {
    name: 'Engr. PEDRO MARTINEZ',
    username: 'pedro_martinez',
    email: 'pedro.martinez@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-003',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-901-234-5678',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'FARM_TO_MARKET_ROAD',
    assignedProject: 'Farm-to-Market Road (Sitio Antipolo, Brgy. Labuin)',
    status: 'active'
  },
  {
    name: 'Ms. ANA REYES',
    username: 'ana_reyes',
    email: 'ana.reyes@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-004',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-912-345-6789',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'GARBAGE_TRUCK',
    assignedProject: 'Garbage Truck Procurement',
    status: 'active'
  },
  {
    name: 'Ms. LUCIA GONZALES',
    username: 'lucia_gonzales',
    email: 'lucia.gonzales@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-005',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-923-456-7890',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'SOCIAL_PENSION',
    assignedProject: 'Social Pension Program',
    status: 'active'
  },
  {
    name: 'Mr. CARLOS LOPEZ',
    username: 'carlos_lopez',
    email: 'carlos.lopez@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-006',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-934-567-8901',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'PANTAWID_PAMILYA',
    assignedProject: 'Pantawid Pamilyang Pilipino Program',
    status: 'active'
  },
  {
    name: 'Ms. ELENA TORRES',
    username: 'elena_torres',
    email: 'elena.torres@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-007',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-945-678-9012',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'LIFE_REWARD_GRANTS',
    assignedProject: 'Life Reward Grants for Senior Citizens',
    status: 'active'
  },
  {
    name: 'Mr. ANTONIO SILVA',
    username: 'antonio_silva',
    email: 'antonio.silva@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-008',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-956-789-0123',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'LIVELIHOOD_RICE',
    assignedProject: 'Livelihood Program – Rice Retailing',
    status: 'active'
  },
  {
    name: 'Engr. ROBERTO MENDES',
    username: 'roberto_mendes',
    email: 'roberto.mendes@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Staff',
    idType: 'EPIU Personnel ID',
    idNumber: 'EIU-009',
    group: 'EPIU',
    department: 'External Implementing Unit',
    position: 'EPIU Staff',
    contactNumber: '+63-967-890-1234',
    address: 'EPIU Office, Santa Cruz, Laguna',
    projectAccess: 'SECURITY_CAMERAS',
    assignedProject: 'Installation of Disaster Area Security Cameras',
    status: 'active'
  },

  // ===== LGU-IU (Internal Units) =====
  {
    name: 'Hon. MAYOR ANTONIO REYES',
    username: 'mayor_reyes',
    email: 'mayor.reyes@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'MDC Chair',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-001',
    group: 'MDC',
    department: 'Municipal Development Council (MDC)',
    position: 'Municipal Mayor',
    contactNumber: '+63-978-901-2345',
    address: 'Municipal Hall, Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },
  {
    name: 'Ms. ISABEL CRUZ',
    username: 'isabel_cruz',
    email: 'isabel.cruz@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Oversight Officer',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-002',
    group: 'Oversight',
    department: 'Municipal Planning and Development Office (MPDC)',
    position: 'Oversight Officer',
    contactNumber: '+63-989-012-3456',
    address: 'Municipal Hall, Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },
  {
    name: 'Engr. MANUEL SANTOS',
    username: 'manuel_santos',
    email: 'manuel.santos@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-003',
    group: 'MEO',
    department: 'Municipal Engineering Office (MEO)',
    position: 'Engineer',
    contactNumber: '+63-990-123-4567',
    address: 'MEO Office, Santa Cruz, Laguna',
    projectAccess: 'MEO',
    status: 'active'
  },
  {
    name: 'Ms. CARMEN VILLANUEVA',
    username: 'carmen_villanueva',
    email: 'carmen.villanueva@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-004',
    group: 'MENRO',
    department: 'Municipal Environment and Natural Resources Office (MENRO)',
    position: 'Environment Officer',
    contactNumber: '+63-901-234-5678',
    address: 'MENRO Office, Santa Cruz, Laguna',
    projectAccess: 'MENRO',
    status: 'active'
  },
  {
    name: 'Mr. FERNANDO AQUINO',
    username: 'fernando_aquino',
    email: 'fernando.aquino@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-005',
    group: 'OMAg',
    department: 'Office of the Municipal Agriculturist (OMAg)',
    position: 'Agricultural Officer',
    contactNumber: '+63-912-345-6789',
    address: 'OMAg Office, Santa Cruz, Laguna',
    projectAccess: 'OMAg',
    status: 'active'
  },
  {
    name: 'Ms. ROSARIO MENDOZA',
    username: 'rosario_mendoza',
    email: 'rosario.mendoza@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-006',
    group: 'MSWDO',
    department: 'Municipal Social Welfare and Development Office (MSWDO)',
    position: 'Social Worker',
    contactNumber: '+63-923-456-7890',
    address: 'MSWDO Office, Santa Cruz, Laguna',
    projectAccess: 'MSWDO',
    status: 'active'
  },
  {
    name: 'Mr. RICARDO FLORES',
    username: 'ricardo_flores',
    email: 'ricardo.flores@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'Implementing Staff',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-IU-007',
    group: 'MDRRMO',
    department: 'Municipal Disaster Risk Reduction and Management Office (MDRRMO)',
    position: 'DRRM Officer',
    contactNumber: '+63-934-567-8901',
    address: 'MDRRMO Office, Santa Cruz, Laguna',
    projectAccess: 'MDRRMO',
    status: 'active'
  },

  // ===== EMS (External Monitoring Stakeholders) =====
  {
    name: 'Ms. GABRIELA SANTOS',
    username: 'gabriela_santos',
    email: 'gabriela.santos@ngo.org.ph',
    password: 'BuildWatch2025!',
    role: 'EMS',
    subRole: 'NGO Representative',
    idType: 'NGO ID',
    idNumber: 'EMS-001',
    group: 'NGO',
    department: 'Non-Government Organization',
    position: 'NGO Representative',
    contactNumber: '+63-945-678-9012',
    address: 'NGO Office, Santa Cruz, Laguna',
    projectAccess: 'VIEW_ONLY',
    status: 'active'
  },
  {
    name: 'Mr. DOMINGO CRUZ',
    username: 'domingo_cruz',
    email: 'domingo.cruz@cso.org.ph',
    password: 'BuildWatch2025!',
    role: 'EMS',
    subRole: 'CSO Member',
    idType: 'CSO ID',
    idNumber: 'EMS-002',
    group: 'CSO',
    department: 'Civil Society Organization',
    position: 'CSO Representative',
    contactNumber: '+63-956-789-0123',
    address: 'CSO Office, Santa Cruz, Laguna',
    projectAccess: 'VIEW_ONLY',
    status: 'active'
  },
  {
    name: 'Ms. LUCIA REYES',
    username: 'lucia_reyes',
    email: 'lucia.reyes@ppmc.org.ph',
    password: 'BuildWatch2025!',
    role: 'EMS',
    subRole: 'PPMC Representative',
    idType: 'PPMC ID',
    idNumber: 'EMS-003',
    group: 'PPMC',
    department: 'Provincial Project Monitoring Committee',
    position: 'PPMC Representative',
    contactNumber: '+63-967-890-1234',
    address: 'PPMC Office, Santa Cruz, Laguna',
    projectAccess: 'VIEW_ONLY',
    status: 'active'
  },

  // ===== SYS.AD (System Oversight and Admin) =====
  {
    name: 'Executive Viewer',
    username: 'executive_viewer',
    email: 'executive.viewer@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'SYS.AD',
    subRole: 'Executive',
    idType: 'LGU Personnel ID',
    idNumber: 'SYS.AD-002',
    group: 'Executive',
    department: 'Municipal Executive Office',
    position: 'Executive Viewer',
    contactNumber: '+63-978-901-2345',
    address: 'Municipal Hall, Santa Cruz, Laguna',
    projectAccess: 'VIEW_ALL',
    status: 'active'
  }
];

async function createSingleUser(userData, userNumber, totalUsers) {
  try {
    writeLog(`\n👤 Processing user ${userNumber}/${totalUsers}: ${userData.name} (${userData.username})`);
    
    // Check for existing user with timeout
    const existingUser = await Promise.race([
      User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { email: userData.email },
            { username: userData.username },
            { idNumber: userData.idNumber }
          ]
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      )
    ]);

    if (existingUser) {
      writeLog(`⚠️  User already exists - ${existingUser.email} (skipping)`);
      return { status: 'SKIPPED', reason: 'User already exists' };
    }

    // Hash password
    writeLog(`🔐 Hashing password for ${userData.username}...`);
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user with timeout
    writeLog(`📝 Creating user record for ${userData.username}...`);
    const user = await Promise.race([
      User.create({
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
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User creation timeout')), 15000)
      )
    ]);

    // Log activity with timeout
    writeLog(`📋 Creating activity log for ${userData.username}...`);
    await Promise.race([
      ActivityLog.create({
        userId: user.id,
        action: 'CREATE_LGU_USER',
        entityType: 'User',
        entityId: user.id,
        details: `Created LGU user: ${user.name} (${user.role}/${user.subRole}) - ${user.department}`,
        ipAddress: '127.0.0.1',
        userAgent: 'LGU User Seeding Script'
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Activity log timeout')), 5000)
      )
    ]);

    writeLog(`✅ Successfully created: ${user.name} (${user.role}/${user.subRole})`);
    return { status: 'CREATED', details: `${userData.role}/${userData.subRole} - ${userData.department}` };

  } catch (error) {
    writeLog(`❌ Failed to create ${userData.username}: ${error.message}`);
    return { status: 'FAILED', reason: error.message };
  }
}

async function seedLGUUsersSimple() {
  try {
    // Clear latest log file
    fs.writeFileSync(latestLogFile, '');
    
    writeLog('🌱 Starting LGU User Seeding (Enhanced Resilient Mode)...');
    writeLog(`📁 Log file: ${logFile}`);
    writeLog(`📁 Latest log: ${latestLogFile}`);
    writeLog(`📊 Total users to process: ${LGU_USERS.length}`);
    writeLog('='.repeat(60));

    const results = {
      created: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    for (let i = 0; i < LGU_USERS.length; i++) {
      const userData = LGU_USERS[i];
      const userNumber = i + 1;
      
      // Process user with individual error handling
      const result = await createSingleUser(userData, userNumber, LGU_USERS.length);
      
      results.details.push({
        username: userData.username,
        ...result
      });

      if (result.status === 'CREATED') {
        results.created++;
      } else if (result.status === 'SKIPPED') {
        results.skipped++;
      } else {
        results.failed++;
      }

      // Progress checkpoint every 5 users
      if (userNumber % 5 === 0) {
        writeLog(`\n📊 Progress Checkpoint: ${userNumber}/${LGU_USERS.length} users processed`);
        writeLog(`   Created: ${results.created}, Skipped: ${results.skipped}, Failed: ${results.failed}`);
      }

      // Add delay between users to prevent database locks
      if (userNumber < LGU_USERS.length) {
        await delay(300); // 300ms delay between users
      }
    }

    // Generate summary report
    writeLog(`\n📊 LGU User Seeding Summary`);
    writeLog('='.repeat(60));
    writeLog(`✅ Created: ${results.created} users`);
    writeLog(`⚠️  Skipped: ${results.skipped} users (already exist)`);
    writeLog(`❌ Failed: ${results.failed} users`);
    writeLog(`📊 Total Processed: ${LGU_USERS.length} users`);

    // Group statistics
    const groupStats = {};
    results.details.forEach(result => {
      if (result.status === 'CREATED') {
        const userData = LGU_USERS.find(u => u.username === result.username);
        if (userData) {
          groupStats[userData.role] = (groupStats[userData.role] || 0) + 1;
        }
      }
    });

    writeLog(`\n👥 User Groups Created:`);
    Object.entries(groupStats).forEach(([group, count]) => {
      writeLog(`   ${group}: ${count} users`);
    });

    writeLog(`\n🔐 Default Login Credentials:`);
    writeLog(`   Username: [username from list above]`);
    writeLog(`   Password: BuildWatch2025!`);
    writeLog(`\n⚠️  IMPORTANT: Users must change password on first login!`);

    writeLog(`\n🎯 Access Control Summary:`);
    writeLog(`   • LGU-PMT: Can access RPMES Forms 5-11, all projects (leadership)`);
    writeLog(`   • EIU: Can access assigned projects only`);
    writeLog(`   • LGU-IU: Can access RPMES Forms 1-4, department projects`);
    writeLog(`   • EMS: View-only access, can submit observations`);
    writeLog(`   • SYS.AD: Full system access, user management`);

    // Write final summary to latest log
    const summary = `\n🎉 SEEDING COMPLETED: ${results.created} created, ${results.skipped} skipped, ${results.failed} failed\n`;
    fs.appendFileSync(latestLogFile, summary);

    return results;

  } catch (error) {
    writeLog(`💥 LGU user seeding failed: ${error.message}`);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  seedLGUUsersSimple()
    .then(() => {
      writeLog('\n🎉 LGU user seeding completed successfully!');
      writeLog('🚀 System ready for UAT and LGU deployment!');
      process.exit(0);
    })
    .catch((error) => {
      writeLog(`💥 LGU user seeding failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { seedLGUUsersSimple, LGU_USERS }; 