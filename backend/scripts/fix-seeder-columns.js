const fs = require('fs');
const path = require('path');

// Define the seeders to fix
const seeders = [
  { path: '../seeders/01-users.js', name: 'Users' },
  { path: '../seeders/02-projects.js', name: 'Projects' }
];

// Define all column name replacements
const replacements = [
  { from: 'createdAt', to: 'created_at' },
  { from: 'updatedAt', to: 'updated_at' },
  { from: 'subRole', to: 'sub_role' },
  { from: 'idType', to: 'id_type' },
  { from: 'idNumber', to: 'id_number' },
  { from: 'contactNumber', to: 'contact_number' },
  { from: 'lastLoginAt', to: 'last_login_at' },
  { from: 'passwordChangedAt', to: 'password_changed_at' },
  { from: 'resetPasswordToken', to: 'reset_password_token' },
  { from: 'resetPasswordExpires', to: 'reset_password_expires' },
  { from: 'costSpent', to: 'cost_spent' },
  { from: 'startDate', to: 'start_date' },
  { from: 'targetDate', to: 'target_date' },
  { from: 'actualStartDate', to: 'actual_start_date' },
  { from: 'implementingUnit', to: 'implementing_unit' },
  { from: 'implementingUnitId', to: 'implementing_unit_id' },
  { from: 'physicalProgress', to: 'physical_progress' },
  { from: 'financialProgress', to: 'financial_progress' },
  { from: 'expectedOutputs', to: 'expected_outputs' },
  { from: 'targetBeneficiaries', to: 'target_beneficiaries' },
  { from: 'mitigationMeasures', to: 'mitigation_measures' },
  { from: 'isActive', to: 'is_active' }
];

// Process each seeder
seeders.forEach(({ path: seederPath, name }) => {
  const fullPath = path.join(__dirname, seederPath);
  
  if (fs.existsSync(fullPath)) {
    // Read the seeder file
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Apply all replacements
    replacements.forEach(({ from, to }) => {
      const regex = new RegExp(`\\b${from}\\b`, 'g');
      content = content.replace(regex, to);
    });
    
    // Write the fixed content back
    fs.writeFileSync(fullPath, content, 'utf8');
    
    console.log(`✓ ${name} seeder column names fixed from camelCase to snake_case`);
  } else {
    console.log(`⚠ ${name} seeder not found at ${fullPath}`);
  }
});

console.log('\nReplaced columns:', replacements.map(r => `${r.from} → ${r.to}`).join(', ')); 