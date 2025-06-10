const db = require("../db/db.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const superAdminFunctions = {
	async superAdminSignup(req,res){
		const { name,email,password,apikey } = req.body;
		if(!name || !email ||  !password || !apikey){
		
		return 	res.status(400).json({
				status:400,
				error: "All field are required(name,email,password,apikey)"
			})
		}
		if(apikey !== process.env.API_KEY){
			res.status(401).json({
				status:401,
				error: "Invalid API key. Access denied."
			});
			return;
		}
	const results = await db.query(`SELECT email FROM super_admins WHERE email = $1`,[email]);
	if(results.length > 0){
	res.status(409).json({
		status:409,
		error:"User with this email already exists."
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
	},
	async superAdminLogin(req,res){
		const { email, password } = req.body;
		if(!email || !password){
	 return res.status(400).json({
				status:400,
				error: "All field are required(email,password)"
			})
		}
		const emailQuery = await db.query(`SELECT email FROM super_admins WHERE email = $1`,[email])
		if(emailQuery.length === 0){
			res.status(401).json({
				status:401,
				error:"Invalid email or password"
			})
			return;
		}
		const passQuery = await db.query(`SELECT password_hash FROM super_admins WHERE email = $1`,[email]);
		const isMatch = await bcrypt.compare(password,passQuery[0].password_hash)  
		if(!isMatch){
			res.status(401).json({
					status:401,
					error:"Invalid email or password"
				})
			return;
		}
		try{
		const infoQuery = await db.query("SELECT * FROM super_admins WHERE email = $1",[email])
		const accessToken = jwt.sign({ id:infoQuery[0].id,name:infoQuery[0].name, email:infoQuery[0].email,role:"super-admin" },process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRIES_IN || "15m" });
		const refreshToken = jwt.sign({ id:infoQuery[0].id,name:infoQuery[0].name, email:infoQuery[0].email,role:"super-admin" },process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRIES_IN || "7d" });
		
		let bool;
		if(process.env.PROJECT_TYPE === "prod"){
		bool = true;
		} else{
		bool = false;
		}
		res.cookie('accessToken', accessToken, {
		      httpOnly: true,         // 👉 Client JS can't access it
		      secure: bool,          // true in production (with HTTPS)
		      sameSite: 'lax',        // Can be 'strict' | 'lax' | 'none'
		      maxAge: 15 * 60 * 1000  // 15 minutes
		    });
		
		    res.cookie('refreshToken', refreshToken, {
		      httpOnly: true,
		      secure: bool,
		      sameSite: 'lax',
		      maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
		    });

		res.json({
			status:200,
			message:"logged In successfully",
			user: {
			    id: infoQuery[0].id,
			    name: infoQuery[0].name,
			    email: infoQuery[0].email
			  }
		})
		} catch(error){
		res.status(500).json({
			status: 500,
			message: "Something went wrong",
			error: error.message,
		 });
		}
	},
	async addAdmin(){
		
	}

}
module.exports = superAdminFunctions;
