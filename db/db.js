const fs = require('fs');
const path = require('path');

const devPath = path.join(__dirname, 'dev.js');
const db = fs.existsSync(devPath) ? require('./dev') : require('./prod');

const isDev = fs.existsSync(devPath);

const createTableSQL = `CREATE TABLE IF NOT EXISTS super_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

// Automatically run table setup
(async () => {
  try {
    await db.query(createTableSQL);
    console.log(`[DB] Users table ready (${isDev ? 'SQLite' : 'PostgreSQL'})`);
  } catch (err) {
    console.error('[DB] Error creating table:', err);
  }
})();

module.exports = db;
