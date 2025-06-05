require("dotenv").config()
const { query } = require('./db');
const isDev = process.env.PROJECT_TYPE === 'dev';

(async () => {
  const createTableSQL = isDev
    ? 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age INT)'
    : 'CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT, age INT)';

  await query(createTableSQL);

  await query('INSERT INTO users (name, age) VALUES ($1, $2)', ['David', 17]);

  const users = await query('SELECT name FROM users WHERE age > $1', [10]);
  console.log(users);
})();
