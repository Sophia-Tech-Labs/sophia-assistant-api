const db = require("../db/db.js");
const bcrypt = require("bcryptjs");
const superAdminFunctions = {
	async superAdminSignup(req,res){
		const { name,email,password,apikey } = req.body;
		if(!name || !email ||  !password || !apikey){
		
		return 	res.status(400).json({
				status:400,
				message: "All field are required(name,email,password,apikey)"
			})
		}
		if(apikey !== process.env.API_KEY){
			res.status(401).json({
				status:401,
				message: "Invalid API key. Access denied."
			});
			return;
		}
	const results = await db.query(`SELECT email FROM super_admins WHERE email = $1`,[email]);
	if(results.length > 0){
	res.status(409).json({
		status:409,
		message:"User with this email already exists."
	})
		return;
	}
		try{
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password,saltRounds);
		const sqlQuery = `INSERT INTO super_admins(name,email,password_hash) VALUES(?,?,?)`;
		await db.query(sqlQuery,[name,email,hashedPassword]);
		res.status(201).json({
			status: 201,
			message: "Super admin created successfully",
		})	
		} catch(error){
			res.status(500).json({
			        status: 500,
			        message: "Something went wrong",
			        error: error.message,
			      });
		}
	}        
}
module.exports = superAdminFunctions;
