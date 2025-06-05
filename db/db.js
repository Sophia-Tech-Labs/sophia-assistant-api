const fs = require('fs');
const path = require('path');

const devPath = path.join(__dirname, 'dev.js');
const db = fs.existsSync(devPath) ? require('./dev') : require('./prod');

const isDev = fs.existsSync(devPath);

const createTableSQL = isDev
  ? `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      age INT
    )`
  : `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      age INT
    )`;

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
