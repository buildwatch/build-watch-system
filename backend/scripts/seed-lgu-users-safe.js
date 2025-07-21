const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const db = require('../models');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create timestamped log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `seed-logs-${timestamp}.txt`);

function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
}

// Test batch of users (5 per group for validation)
const TEST_USERS = [
  // LGU-PMT Mock User for Testing
  {
    name: 'LGU-PMT Test User',
    username: 'lgupmt1',
    email: 'lgupmt1@santacruz.gov.ph',
    password: 'test1234',
    role: 'LGU-PMT',
    subRole: 'MPMEC',
    idType: 'LGU Personnel ID',
    idNumber: 'LGU-PMT-TEST-001',
    group: 'MPMEC',
    department: 'Municipal Project Monitoring and Evaluation Committee',
    position: 'Validator',
    contactNumber: '+639171234567',
    address: 'LGU Santa Cruz, Laguna',
    projectAccess: 'ALL',
    status: 'active'
  },
  // LGU-PMT Test Users
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
    projectAccess: 'ALL',
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
    projectAccess: 'ALL',
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
    projectAccess: 'ALL',
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
    projectAccess: 'ALL',
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
    projectAccess: 'MSWDO',
    status: 'active'
  },

  // EIU Test Users
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

  // LGU-IU Test Users
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

  // EMS Test Users
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

  // SYS.AD Test Users
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

async function seedLGUUsersSafe(userBatch = TEST_USERS, batchName = 'Test Batch') {
  const transaction = await db.sequelize.transaction();
  
  try {
    writeLog(`🚀 Starting ${batchName} LGU User Seeding...`);
    writeLog(`📁 Log file: ${logFile}`);
    writeLog(`📊 Total users to process: ${userBatch.length}`);
    writeLog('='.repeat(60));

    const results = {
      created: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    for (let i = 0; i < userBatch.length; i++) {
      const userData = userBatch[i];
      const userNumber = i + 1;
      
      try {
        writeLog(`\n👤 Processing user ${userNumber}/${userBatch.length}: ${userData.name}`);
        
        // Check for existing user by email and username
        const existingUser = await User.findOne({
          where: {
            [db.Sequelize.Op.or]: [
              { email: userData.email },
              { username: userData.username },
              { idNumber: userData.idNumber }
            ]
          },
          transaction
        });

        if (existingUser) {
          writeLog(`⚠️  User already exists - ${existingUser.email} (skipping)`);
          results.skipped++;
          results.details.push({
            username: userData.username,
            status: 'SKIPPED',
            reason: 'User already exists'
          });
          continue;
        }

        // Hash password
        writeLog(`🔐 Hashing password for ${userData.username}...`);
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create user within transaction
        writeLog(`📝 Creating user record for ${userData.username}...`);
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
        }, { transaction });

        // Log activity within transaction
        writeLog(`📋 Creating activity log for ${userData.username}...`);
        await ActivityLog.create({
          userId: user.id,
          action: 'CREATE_LGU_USER',
          entityType: 'User',
          entityId: user.id,
          details: `Created LGU user: ${user.name} (${user.role}/${user.subRole}) - ${user.department}`,
          ipAddress: '127.0.0.1',
          userAgent: 'LGU User Seeding Script'
        }, { transaction });

        writeLog(`✅ Successfully created: ${user.name} (${user.role}/${user.subRole})`);
        results.created++;
        results.details.push({
          username: userData.username,
          status: 'CREATED',
          details: `${userData.role}/${userData.subRole} - ${userData.department}`
        });

        // Progress checkpoint every 5 users
        if (userNumber % 5 === 0) {
          writeLog(`\n📊 Progress Checkpoint: ${userNumber}/${userBatch.length} users processed`);
          writeLog(`   Created: ${results.created}, Skipped: ${results.skipped}, Failed: ${results.failed}`);
        }

      } catch (error) {
        writeLog(`❌ Failed to create ${userData.username}: ${error.message}`);
        results.failed++;
        results.details.push({
          username: userData.username,
          status: 'FAILED',
          reason: error.message
        });
        
        // Continue with next user instead of failing entire batch
        continue;
      }
    }

    // Commit transaction if all users processed successfully
    await transaction.commit();
    writeLog(`\n✅ Transaction committed successfully!`);

    // Generate summary report
    writeLog(`\n📊 ${batchName} Seeding Summary`);
    writeLog('='.repeat(60));
    writeLog(`✅ Created: ${results.created} users`);
    writeLog(`⚠️  Skipped: ${results.skipped} users (already exist)`);
    writeLog(`❌ Failed: ${results.failed} users`);
    writeLog(`📊 Total Processed: ${userBatch.length} users`);

    // Group statistics
    const groupStats = {};
    results.details.forEach(result => {
      if (result.status === 'CREATED') {
        const userData = userBatch.find(u => u.username === result.username);
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

    return results;

  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    writeLog(`💥 Transaction rolled back due to error: ${error.message}`);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  const batchType = process.argv[2] || 'test';
  
  if (batchType === 'test') {
    writeLog('🧪 Running TEST BATCH (5 users per group)...');
    seedLGUUsersSafe(TEST_USERS, 'Test Batch')
      .then(() => {
        writeLog('\n🎉 Test batch seeding completed successfully!');
        writeLog('🚀 Ready for full batch seeding!');
        process.exit(0);
      })
      .catch((error) => {
        writeLog(`💥 Test batch seeding failed: ${error.message}`);
        process.exit(1);
      });
  } else {
    writeLog('❌ Invalid batch type. Use: node seed-lgu-users-safe.js test');
    process.exit(1);
  }
}

module.exports = { seedLGUUsersSafe, TEST_USERS }; 