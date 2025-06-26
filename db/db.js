const fs = require('fs');
const path = require('path');

const devPath = path.join(__dirname, 'dev.js');
const db = fs.existsSync(devPath) ? require('./dev') : require('./prod');

const isDev = fs.existsSync(devPath);
async function test(){
if(isDev){
await db.query("PRAGMA foreign_keys = ON;")
}
}
test()
const createTableSQL = isDev ? `CREATE TABLE IF NOT EXISTS super_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
   reset_token TEXT,
  reset_token_expires TEXT
);` : `CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reset_token TEXT,
  reset_token_expires TEXT
);`;

const createAdminSQLTable = isDev ? `CREATE TABLE IF NOT EXISTS admins(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	is_verified BOOLEAN DEFAULT 0,
	signup_token TEXT,
	token_expires DATETIME,
	 reset_token TEXT,
  reset_token_expires TEXT
	
);` : `CREATE TABLE IF NOT EXISTS admins(
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	is_verified BOOLEAN DEFAULT FALSE,
	signup_token TEXT,
	token_expires TIMESTAMP,
	 reset_token TEXT,
  reset_token_expires TEXT
	
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
  admin_code TEXT NOT NULL,
  reset_token TEXT,
  reset_token_expires TEXT,
  is_linked BOOLEAN DEFAULT 0,
  api_key TEXT UNIQUE
  
);` : `CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  main_phone TEXT NOT NULL,
  assistant_phone TEXT NOT NULL,
  admin_code TEXT NOT NULL,
  reset_token TEXT,
  reset_token_expires TEXT,
  is_linked BOOLEAN DEFAULT FALSE,
  api_key TEXT UNIQUE
);`;

const createSessionSQLTable = isDev ? `CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  creds TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);` : `CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  creds JSONB NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`;
const createKeysSQLTable = isDev ? `CREATE TABLE IF NOT EXISTS keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  key_id TEXT NOT NULL,
  value TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  UNIQUE(category, key_id, user_id, session_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);` : `CREATE TABLE keys (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  key_id TEXT NOT NULL,
  value JSONB NOT NULL,
  user_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  UNIQUE(category, key_id, user_id, session_id),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);`;
// Automatically run table setup
async function createTable (){
  try {
  await Promise.all([
    db.query(createTableSQL),
    db.query(createAdminSQLTable),
    db.query(createUserSQLTable),
    db.query(createAdminCodeSQLTable),
       ])
       await db.query(createSessionSQLTable);
    	await db.query(createKeysSQLTable);

    console.log(`[DB] Users table ready (${isDev ? 'SQLite' : 'PostgreSQL'})`);
  } catch (err) {
    console.error('[DB] Error creating table:', err);
  }
}
createTable();

module.exports = db;
