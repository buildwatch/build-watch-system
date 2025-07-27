const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function backupDatabase() {
  try {
    console.log('🔄 Starting database backup...');
    
    // Database configuration
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'buildwatch_123',
      database: process.env.DB_NAME || 'buildwatch_lgu',
      port: process.env.DB_PORT || 3306
    };

    console.log(`📊 Connecting to database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    
    // Create connection
    const connection = await mysql.createConnection(dbConfig);
    
    // Get all tables
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    console.log(`📋 Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
    
    let backupSQL = `-- Build Watch LGU Database Backup
-- Generated on: ${new Date().toISOString()}
-- Database: ${dbConfig.database}

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

`;

    // Backup each table
    for (const tableName of tableNames) {
      console.log(`📦 Backing up table: ${tableName}`);
      
      // Get table structure
      const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
      backupSQL += `\n-- Table structure for table \`${tableName}\`\n`;
      backupSQL += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      backupSQL += `${createTable[0]['Create Table']};\n\n`;
      
      // Get table data
      const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
      
      if (rows.length > 0) {
        backupSQL += `-- Data for table \`${tableName}\`\n`;
        
        // Get column names
        const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
        const columnNames = columns.map(col => col.Field);
        
        // Insert data
        for (const row of rows) {
          const values = columnNames.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            return value;
          });
          
          backupSQL += `INSERT INTO \`${tableName}\` (\`${columnNames.join('`, `')}\`) VALUES (${values.join(', ')});\n`;
        }
        backupSQL += '\n';
      }
    }
    
    backupSQL += `SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
`;

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Write backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFileName = `buildwatch_lgu_backup_${timestamp}.sql`;
    const backupFilePath = path.join(backupDir, backupFileName);
    
    await fs.writeFile(backupFilePath, backupSQL, 'utf8');
    
    console.log(`✅ Database backup completed successfully!`);
    console.log(`📁 Backup file: ${backupFilePath}`);
    console.log(`📊 Tables backed up: ${tableNames.length}`);
    console.log(`💾 File size: ${(backupSQL.length / 1024 / 1024).toFixed(2)} MB`);
    
    await connection.end();
    
    return backupFilePath;
    
  } catch (error) {
    console.error('❌ Database backup failed:', error.message);
    process.exit(1);
  }
}

// Run backup if called directly
if (require.main === module) {
  backupDatabase();
}

module.exports = backupDatabase; 