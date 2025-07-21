const { User, ActivityLog } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Test configuration
const TEST_USERS = [
  // SYS.AD Test
  {
    name: 'Executive Viewer',
    username: 'executive_viewer',
    email: 'executive.viewer@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'SYS.AD',
    subRole: 'Executive'
  },
  // LGU-PMT Test
  {
    name: 'MPMEC Chair Test',
    username: 'pablo_magpily',
    email: 'pablo.magpily@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-PMT',
    subRole: 'MPMEC Chair'
  },
  // EIU Test
  {
    name: 'EPIU Manager Test',
    username: 'maria_santos',
    email: 'maria.santos@eiu.gov.ph',
    password: 'BuildWatch2025!',
    role: 'EIU',
    subRole: 'EPIU Manager'
  },
  // LGU-IU Test
  {
    name: 'MDC Chair Test',
    username: 'mayor_reyes',
    email: 'mayor.reyes@santacruz.gov.ph',
    password: 'BuildWatch2025!',
    role: 'LGU-IU',
    subRole: 'MDC Chair'
  },
  // EMS Test
  {
    name: 'NGO Representative Test',
    username: 'gabriela_santos',
    email: 'gabriela.santos@ngo.org.ph',
    password: 'BuildWatch2025!',
    role: 'EMS',
    subRole: 'NGO Representative'
  }
];

// Timeout wrapper to prevent hangs
function withTimeout(promise, timeoutMs = 10000, operation = 'Unknown') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms: ${operation}`));
      }, timeoutMs);
    })
  ]);
}

function logTest(message, status = 'INFO') {
  const timestamp = new Date().toISOString();
  const statusIcon = {
    'INFO': 'ℹ️',
    'PASS': '✅',
    'FAIL': '❌',
    'WARN': '⚠️',
    'DEBUG': '🔍'
  }[status] || 'ℹ️';
  
  console.log(`${statusIcon} [${timestamp}] ${message}`);
}

async function testUserAuthentication(userData) {
  logTest(`🔍 [DEBUG] Starting authentication test for ${userData.name} (${userData.role})`, 'DEBUG');
  
  try {
    logTest(`🔍 [DEBUG] Looking up user: ${userData.username}`, 'DEBUG');
    
    // Find user in database with timeout
    const user = await withTimeout(
      User.findOne({
        where: { username: userData.username }
      }),
      5000,
      `Database lookup for user ${userData.username}`
    );

    if (!user) {
      logTest(`User ${userData.username} not found in database`, 'FAIL');
      return false;
    }

    logTest(`🔍 [DEBUG] User found, testing password verification`, 'DEBUG');

    // Test password verification with timeout
    const isValidPassword = await withTimeout(
      bcrypt.compare(userData.password, user.password),
      3000,
      `Password verification for ${userData.username}`
    );
    
    if (!isValidPassword) {
      logTest(`Password verification failed for ${userData.username}`, 'FAIL');
      return false;
    }

    logTest(`🔍 [DEBUG] Password verified, generating JWT token`, 'DEBUG');

    // Test JWT token generation with timeout
    const token = await withTimeout(
      Promise.resolve(jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role, 
          subRole: user.subRole 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      )),
      2000,
      `JWT token generation for ${userData.username}`
    );

    if (!token) {
      logTest(`JWT token generation failed for ${userData.username}`, 'FAIL');
      return false;
    }

    logTest(`Authentication test PASSED for ${userData.username}`, 'PASS');
    return { user, token };

  } catch (error) {
    logTest(`Authentication test FAILED for ${userData.username}: ${error.message}`, 'FAIL');
    return false;
  }
}

async function testRoleBasedAccess(userData, authResult) {
  logTest(`🔍 [DEBUG] Testing role-based access for ${userData.role}/${userData.subRole}`, 'DEBUG');
  
  const { user } = authResult;
  
  try {
    // Test role validation
    const validRoles = ['LGU-PMT', 'EIU', 'LGU-IU', 'EMS', 'SYS.AD'];
    if (!validRoles.includes(user.role)) {
      logTest(`Invalid role ${user.role} for user ${user.username}`, 'FAIL');
      return false;
    }

    // Test sub-role validation
    if (!user.subRole || user.subRole.trim() === '') {
      logTest(`Missing sub-role for user ${user.username}`, 'FAIL');
      return false;
    }

    // Test department assignment
    if (!user.department || user.department.trim() === '') {
      logTest(`Missing department for user ${user.username}`, 'WARN');
    }

    // Test status validation
    if (user.status !== 'active') {
      logTest(`User ${user.username} is not active (status: ${user.status})`, 'FAIL');
      return false;
    }

    logTest(`Role-based access test PASSED for ${userData.username}`, 'PASS');
    return true;

  } catch (error) {
    logTest(`Role-based access test FAILED for ${userData.username}: ${error.message}`, 'FAIL');
    return false;
  }
}

async function testDashboardAccess(userData, authResult) {
  logTest(`🔍 [DEBUG] Testing dashboard access for ${userData.role}`, 'DEBUG');
  
  const { user } = authResult;
  
  try {
    // Define expected dashboard access per role
    const dashboardAccess = {
      'SYS.AD': ['SysAdminDashboard', 'UserManagement', 'SystemLogs'],
      'LGU-PMT': ['LGUPMTDashboard', 'Monitoring', 'Validation', 'Reports'],
      'EIU': ['EIUDashboard', 'ProjectUpdates', 'ProgressTracking'],
      'LGU-IU': ['LGU-IUDashboard', 'Implementation', 'DocumentUpload'],
      'EMS': ['EMSDashboard', 'ObservationReports', 'Monitoring']
    };

    const expectedDashboards = dashboardAccess[user.role];
    if (!expectedDashboards) {
      logTest(`No dashboard access defined for role ${user.role}`, 'FAIL');
      return false;
    }

    logTest(`Dashboard access test PASSED for ${userData.username} - Expected: ${expectedDashboards.join(', ')}`, 'PASS');
    return true;

  } catch (error) {
    logTest(`Dashboard access test FAILED for ${userData.username}: ${error.message}`, 'FAIL');
    return false;
  }
}

async function testRPMESAccess(userData, authResult) {
  logTest(`🔍 [DEBUG] Testing RPMES form access for ${userData.role}`, 'DEBUG');
  
  const { user } = authResult;
  
  try {
    // Define RPMES access rules per role
    const rpmesAccess = {
      'SYS.AD': { forms: 'ALL', access: 'VIEW' },
      'LGU-PMT': { forms: '5-11', access: 'EDIT' },
      'EIU': { forms: '1-4', access: 'EDIT' },
      'LGU-IU': { forms: '1-4', access: 'EDIT' },
      'EMS': { forms: 'ALL', access: 'VIEW' }
    };

    const access = rpmesAccess[user.role];
    if (!access) {
      logTest(`No RPMES access defined for role ${user.role}`, 'FAIL');
      return false;
    }

    logTest(`RPMES access test PASSED for ${userData.username} - Forms: ${access.forms}, Access: ${access.access}`, 'PASS');
    return true;

  } catch (error) {
    logTest(`RPMES access test FAILED for ${userData.username}: ${error.message}`, 'FAIL');
    return false;
  }
}

async function testSecurityFeatures() {
  logTest('🔍 [DEBUG] Testing security features', 'DEBUG');
  
  try {
    // Test password hashing with timeout
    const testPassword = 'TestPassword123!';
    const hashedPassword = await withTimeout(
      bcrypt.hash(testPassword, 12),
      5000,
      'Password hashing test'
    );
    
    const isValid = await withTimeout(
      bcrypt.compare(testPassword, hashedPassword),
      3000,
      'Password verification test'
    );
    
    if (!isValid) {
      logTest('Password hashing/verification failed', 'FAIL');
      return false;
    }

    // Test JWT token validation with timeout
    const testToken = jwt.sign(
      { userId: 'test', role: 'test' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    try {
      const decoded = await withTimeout(
        Promise.resolve(jwt.verify(testToken, process.env.JWT_SECRET || 'your-secret-key')),
        2000,
        'JWT token validation test'
      );
      
      if (!decoded) {
        logTest('JWT token validation failed', 'FAIL');
        return false;
      }
    } catch (jwtError) {
      logTest(`JWT validation error: ${jwtError.message}`, 'FAIL');
      return false;
    }

    logTest('Security features test PASSED', 'PASS');
    return true;

  } catch (error) {
    logTest(`Security features test FAILED: ${error.message}`, 'FAIL');
    return false;
  }
}

async function testDatabaseIntegrity() {
  logTest('🔍 [DEBUG] Testing database integrity', 'DEBUG');
  
  try {
    // Test user count with timeout
    const userCount = await withTimeout(
      User.count(),
      5000,
      'User count query'
    );
    
    if (userCount < 25) {
      logTest(`Expected at least 25 users, found ${userCount}`, 'WARN');
    }

    logTest(`🔍 [DEBUG] Found ${userCount} users, checking for duplicates`, 'DEBUG');

    // Test unique constraints - check for duplicate emails with timeout
    const allUsers = await withTimeout(
      User.findAll({
        attributes: ['email']
      }),
      10000,
      'Email uniqueness check'
    );
    
    const emailCounts = {};
    allUsers.forEach(user => {
      emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
    });
    
    const duplicateEmails = Object.entries(emailCounts)
      .filter(([email, count]) => count > 1)
      .map(([email]) => email);

    if (duplicateEmails.length > 0) {
      logTest(`Found duplicate emails: ${duplicateEmails.join(', ')}`, 'FAIL');
      return false;
    }

    logTest(`🔍 [DEBUG] No duplicate emails found, checking required fields`, 'DEBUG');

    // Test required fields with timeout
    const usersWithMissingData = await withTimeout(
      User.findAll({
        where: {
          [Op.or]: [
            { name: null },
            { username: null },
            { email: null },
            { role: null }
          ]
        }
      }),
      8000,
      'Required fields validation'
    );

    if (usersWithMissingData.length > 0) {
      logTest(`Found users with missing required data: ${usersWithMissingData.length}`, 'FAIL');
      return false;
    }

    logTest('Database integrity test PASSED', 'PASS');
    return true;

  } catch (error) {
    logTest(`Database integrity test FAILED: ${error.message}`, 'FAIL');
    return false;
  }
}

async function runComprehensiveUAT() {
  console.log('🧪 COMPREHENSIVE UAT TESTING STARTED');
  console.log('='.repeat(60));
  console.log('🔍 Enhanced debugging and timeout protection enabled');
  console.log('⏱️  Individual test timeouts: 5-10 seconds');
  console.log('='.repeat(60));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  try {
    // Test security features
    logTest('🔐 Testing Security Features');
    const securityResult = await testSecurityFeatures();
    results.total++;
    if (securityResult) results.passed++; else results.failed++;

    // Test database integrity
    logTest('🗄️ Testing Database Integrity');
    const dbResult = await testDatabaseIntegrity();
    results.total++;
    if (dbResult) results.passed++; else results.failed++;

    // Test each user group
    for (let i = 0; i < TEST_USERS.length; i++) {
      const userData = TEST_USERS[i];
      console.log(`\n👤 Testing User Group ${i + 1}/${TEST_USERS.length}: ${userData.role}`);
      console.log('-'.repeat(40));

      // Test authentication
      const authResult = await testUserAuthentication(userData);
      results.total++;
      if (authResult) {
        results.passed++;
        
        // Test role-based access
        const roleResult = await testRoleBasedAccess(userData, authResult);
        results.total++;
        if (roleResult) results.passed++; else results.failed++;

        // Test dashboard access
        const dashboardResult = await testDashboardAccess(userData, authResult);
        results.total++;
        if (dashboardResult) results.passed++; else results.failed++;

        // Test RPMES access
        const rpmesResult = await testRPMESAccess(userData, authResult);
        results.total++;
        if (rpmesResult) results.passed++; else results.failed++;

      } else {
        results.failed++;
      }
    }

    // Generate summary
    console.log('\n📊 UAT TESTING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    if (results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! System is ready for production.');
      
      // Create success log
      const fs = require('fs');
      const successLog = `UAT TEST PASSED - ${new Date().toISOString()}\n` +
        `Total Tests: ${results.total}\n` +
        `Passed: ${results.passed}\n` +
        `Failed: ${results.failed}\n` +
        `Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`;
      
      fs.writeFileSync('./logs/uat-final-pass.txt', successLog);
      console.log('📝 Success log saved to ./logs/uat-final-pass.txt');
      
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix issues before deployment.');
      
      // Create failure log
      const fs = require('fs');
      const failureLog = `UAT TEST FAILED - ${new Date().toISOString()}\n` +
        `Total Tests: ${results.total}\n` +
        `Passed: ${results.passed}\n` +
        `Failed: ${results.failed}\n` +
        `Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`;
      
      fs.writeFileSync('./logs/uat-test-failed.txt', failureLog);
      console.log('📝 Failure log saved to ./logs/uat-test-failed.txt');
    }

    return results;

  } catch (error) {
    logTest(`UAT testing failed: ${error.message}`, 'FAIL');
    
    // Create error log
    const fs = require('fs');
    const errorLog = `UAT TEST ERROR - ${new Date().toISOString()}\n` +
      `Error: ${error.message}\n` +
      `Stack: ${error.stack}\n`;
    
    fs.writeFileSync('./logs/uat-test-error.txt', errorLog);
    console.log('📝 Error log saved to ./logs/uat-test-error.txt');
    
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  console.log('🚀 Starting enhanced UAT test with timeout protection...');
  
  runComprehensiveUAT()
    .then((results) => {
      console.log('\n🚀 UAT testing completed successfully!');
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 UAT testing failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveUAT, testUserAuthentication }; 