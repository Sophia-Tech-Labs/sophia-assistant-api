const fs = require('fs');
const path = require('path');

const devPath = path.join(__dirname, 'dev.js');
const db = fs.existsSync(devPath) ? require('./dev') : require('./prod');

const isDev = fs.existsSync(devPath);

const createTableSQL = isDev ? `CREATE TABLE IF NOT EXISTS super_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);` : `CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

const createAdminSQLTable = isDev ? `CREATE TABLE IF NOT EXISTS admins(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	
);` : `CREATE TABLE IF NOT EXISTS admins(
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	
);`;
const createAdminCodeSQLTable = isDev ? `CREATE TABLE IF NOT EXISTS admin_codes(	
	id INTEGER PRIMARY KEY AUTOINCREMENT,
 	adm_codes TEXT NOT NULL,
	creation_time TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	validity BOOLEAN DEFAULT 1

);` : `CREATE TABLE IF NOT EXISTS admin_codes(
	id SERIAL PRIMARY KEY,
	adm_codes TEXT NOT NULL,
	creation_time TEXT NOT NULL,
 	expires_at TEXT NOT NULL,
  	validity BOOLEAN DEFAULT TRUE
);`;

const createUserSQLTable = isDev ? ` CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  main_phone TEXT NOT NULL,
  assistant_phone TEXT NOT NULL,
  admin_code TEXT NOT NULL
);` : `CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  main_phone TEXT NOT NULL,
  assistant_phone TEXT NOT NULL,
  admin_code TEXT NOT NULL
);`

// Automatically run table setup
(async () => {
  try {
    await db.query(createTableSQL);
    await db.query(createAdminSQLTable);
    await db.query(createUserSQLTable);
    await db.query(createAdminCodeSQLTable);
    console.log(`[DB] Users table ready (${isDev ? 'SQLite' : 'PostgreSQL'})`);
  } catch (err) {
    console.error('[DB] Error creating table:', err);
  }
})();

module.exports = db;
