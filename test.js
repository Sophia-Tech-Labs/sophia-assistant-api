const db = require("./db/db.js");
const email = "ayanokoji@gmail.com";
(async()=>{
	const output = await db.query("SELECT * FROM super_admins WHERE email = $1",[email]);
	await console.log(output)
})()
