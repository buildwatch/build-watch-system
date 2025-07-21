const { User } = require('../models');

async function addBirthdateToUsers() {
  try {
    console.log('🔧 Adding birthdate data to existing Secretariat and MPMEC users...');

    // Find Secretariat users
    const secretariatUsers = await User.findAll({
      where: {
        subRole: 'MPMEC Secretariat'
      }
    });

    console.log(`📋 Found ${secretariatUsers.length} Secretariat users`);

    for (const user of secretariatUsers) {
      if (!user.birthdate) {
        // Generate a random birthdate between 1960 and 1990
        const startYear = 1960;
        const endYear = 1990;
        const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        
        const birthdate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        await user.update({ birthdate });
        console.log(`✅ Updated Secretariat user ${user.name} with birthdate: ${birthdate}`);
      } else {
        console.log(`ℹ️  Secretariat user ${user.name} already has birthdate: ${user.birthdate}`);
      }
    }

    // Find MPMEC users
    const mpmecUsers = await User.findAll({
      where: {
        subRole: 'MPMEC'
      }
    });

    console.log(`📋 Found ${mpmecUsers.length} MPMEC users`);

    for (const user of mpmecUsers) {
      if (!user.birthdate) {
        // Generate a random birthdate between 1960 and 1990
        const startYear = 1960;
        const endYear = 1990;
        const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        
        const birthdate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        await user.update({ birthdate });
        console.log(`✅ Updated MPMEC user ${user.name} with birthdate: ${birthdate}`);
      } else {
        console.log(`ℹ️  MPMEC user ${user.name} already has birthdate: ${user.birthdate}`);
      }
    }

    console.log('\n🎉 Birthdate update completed!');
    console.log('📋 Users should now display birthdate information in their profile pages.');

  } catch (error) {
    console.error('❌ Error updating user birthdates:', error);
  }
}

addBirthdateToUsers(); 