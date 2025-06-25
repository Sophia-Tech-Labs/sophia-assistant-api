const crypto = require("crypto");
const db = require("./db/db.js");
function generateApiKey() {
  return crypto.randomBytes(32).toString("hex"); // 64-character hex string
}

(async ()=>{
	const apiKey = generateApiKey();
	await db.query("UPDATE users SET api_key = $1 WHERE email = $2",[apiKey,"ayanokoji2306@gmail.com"]);
})()
