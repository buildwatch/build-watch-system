const { sequelize } = require('../models');

async function updateDepartmentsSQL() {
  try {
    console.log('🔄 Updating LGU-IU users department field using SQL...');
    
    // SQL to update departments based on full names
    const updateQueries = [
      // Update Municipal Engineer's Office
      `UPDATE users SET department = "Municipal Engineer's Office" 
       WHERE (fullName LIKE '%Municipal Engineer%' OR fullName LIKE "%Engineer's Office%") 
       AND \`group\` = 'LGU-IU' AND status != 'deleted'`,
      
      // Update Municipal Agriculturist's Office
      `UPDATE users SET department = "Municipal Agriculturist's Office" 
       WHERE (fullName LIKE '%Municipal Agriculturist%' OR fullName LIKE "%Agriculturist's Office%") 
       AND \`group\` = 'LGU-IU' AND status != 'deleted'`,
      
      // Update Municipal General Services Office
      `UPDATE users SET department = "Municipal General Services Office" 
       WHERE (fullName LIKE '%Municipal General Services%' OR fullName LIKE '%General Services Office%') 
       AND \`group\` = 'LGU-IU' AND status != 'deleted'`,
      
      // Update Municipal Social Welfare and Development Office
      `UPDATE users SET department = "Municipal Social Welfare and Development Office" 
       WHERE (fullName LIKE '%Municipal Social Welfare%' OR fullName LIKE '%Social Welfare and Development%') 
       AND \`group\` = 'LGU-IU' AND status != 'deleted'`,
      
      // Update Municipal Disaster and Risk Reduction Management Office
      `UPDATE users SET department = "Municipal Disaster and Risk Reduction Management Office" 
       WHERE (fullName LIKE '%Municipal Disaster%' OR fullName LIKE '%Risk Reduction%' OR fullName LIKE '%MDRRMO%') 
       AND \`group\` = 'LGU-IU' AND status != 'deleted'`
    ];

    let totalUpdated = 0;
    
    for (const query of updateQueries) {
      const [result] = await sequelize.query(query);
      console.log(`✅ Updated ${result.affectedRows} users with query: ${query.substring(0, 50)}...`);
      totalUpdated += result.affectedRows;
    }

    // Verify the updates
    const [verifyResults] = await sequelize.query(`
      SELECT fullName, department, username 
      FROM users 
      WHERE \`group\` = 'LGU-IU' 
      AND status != 'deleted' 
      AND department IS NOT NULL
      ORDER BY department, fullName
    `);

    console.log('\n📊 VERIFICATION RESULTS:');
    console.log('='.repeat(60));
    console.log(`Total users with department field populated: ${verifyResults.length}`);
    
    verifyResults.forEach(user => {
      console.log(`   ${user.fullName} -> ${user.department}`);
    });

    console.log(`\n✅ Successfully updated ${totalUpdated} LGU-IU users!`);
    return { totalUpdated, users: verifyResults };

  } catch (error) {
    console.error('❌ Error updating departments:', error);
    throw error;
  }
}

// Run the script
updateDepartmentsSQL()
  .then(() => {
    console.log('\n🎉 Department update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Department update failed:', error);
    process.exit(1);
  }); 