const db = require('../models');

async function checkAnnouncementSchema() {
  try {
    await db.sequelize.authenticate();
    const [results] = await db.sequelize.query("DESCRIBE announcements");
    console.table(results);
  } catch (error) {
    console.error(error);
  } finally {
    await db.sequelize.close();
  }
}

checkAnnouncementSchema(); 