const db = require("../db/db.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const superAdminFunctions = {
	async superAdminSignup(req,res){
		const { name,email,password,adminkey } = req.body;
		if(!name || !email ||  !password || !adminkey){
		return 	res.status(400).json({
				status:400,
				error: "All field are required"
			});
		}
		if(adminkey !== process.env.API_KEY){
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
		const sqlQuery = `INSERT INTO super_admins(name,email,password_hash) VALUES($1,$2,$3)`;
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
	async superAdminLogin(req, res) {
	  const { email, password } = req.body;
	  if (!email || !password) {
	    return res.status(400).json({
	      status: 400,
	      error: "All field are required(email,password)",
	    });
	  }
	  const emailQuery = await db.query(`SELECT email FROM super_admins WHERE email = $1`, [email]);
	  if (emailQuery.length === 0) {
	    return res.status(401).json({
	      status: 401,
	      error: "Invalid email or password",
	    });
	  }
	
	  const passQuery = await db.query(`SELECT password_hash FROM super_admins WHERE email = $1`, [email]);
	  const isMatch = await bcrypt.compare(password, passQuery[0].password_hash);
	  if (!isMatch) {
	    return res.status(401).json({
	      status: 401,
	      error: "Invalid email or password",
	    });
	  }
	
	  try {
	    const infoQuery = await db.query("SELECT * FROM super_admins WHERE email = $1", [email]);
	    const payload = {
	      id: infoQuery[0].id,
	      name: infoQuery[0].name,
	      email: infoQuery[0].email,
	      role: "super-admin",
	    };
	
	    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
	    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

	    res.json({
	      status: 200,
	      message: "Logged In successfully",
	      accessToken,
	      refreshToken,
	      user: payload,
	    });
	  } catch (error) {
	    res.status(500).json({
	      status: 500,
	      error: "Something went wrong",
	      message: error.message,
	    });
	  }
	},
	async inviteAdmin(req,res){
		const { name,email } = req.body;
		if(!name || !email){
			res.status(400).json({
				status:400,
				error:"All fields are required (name,email,password)"
			})
			return;
		}
		const results = await db.query(`SELECT email FROM admins WHERE email = $1`,[email]);
			if(results.length > 0){
			res.status(409).json({
				status:409,
				error:"Admin with this email already exists."
			})
				return;
		}
		try{
			const token = crypto.randomBytes(32).toString("hex");
			let expiresAt;
			if(process.env.PROJECT_TYPE === "prod"){
				expiresAt = new Date(Date.now() + 15 * 60 * 1000);	
			} else {
			 expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0] ;
			 }

			 await db.query(
			     `INSERT INTO admins (name, email, password_hash, signup_token, token_expires)
			      VALUES ($1, $2, $3, $4, $5)`,
			     [name, email, token,  token, expiresAt]
			   );
			 
			   // Respond with success (you can send link here if needed)
			   return res.status(200).json({
			     status: 200,
			     message: "Signup link sent to admin.",
			     signupLink:`http://localhost:4000/admin/complete-signup/${token}`
			   });
		} catch(error){
			console.error(error);
			 return res.status(500).json({
			    status: 500,
			    error: "Something went wrong.",
			  });
		}	
	},
	
	
async completeSignupG(req, res){
	  const token = req.params.token;
	
	  try {
	    const result = await db.query(
	      `SELECT name, email, token_expires FROM admins WHERE signup_token = $1`,
	      [token]
	    );
	
	    if (result.length === 0) {
	      return res.status(404).send('Invalid or expired signup link.');
	    }
	
	    const user = result[0];
	    const now = new Date();
	
	    // Check if expired
	    if (new Date(user.token_expires) < now) {
	   // await db.query("DELETE FROM admins WHERE signup_token = $1",[token]);
	      return res.status(410).send('Signup link has expired.');
	    }
	
	    // Serve HTML form
	    res.send(`
	      <html>
	        <head>
	          <title>Complete Signup</title>
	          <style>
	            body {
	              font-family: Arial;
	              background: #f8f8f8;
	              display: flex;
	              justify-content: center;
	              align-items: center;
	              height: 100vh;
	            }
	            .card {
	              background: white;
	              padding: 30px;
	              border-radius: 10px;
	              box-shadow: 0 0 15px rgba(0,0,0,0.1);
	              text-align: center;
	            }
	            input, button {
	              width: 100%;
	              padding: 10px;
	              margin: 10px 0;
	              border-radius: 5px;
	              border: 1px solid #ccc;
	            }
	            button {
	              background: black;
	              color: white;
	              cursor: pointer;
	            }
	          </style>
	        </head>
	        <body>
	          <div class="card">
	            <h2>Hello, ${user.name} 👋</h2>
	            <p>Complete your signup below</p>
	            <form method="POST" action="/admin/complete-signup/${token}">
	              <input type="password" name="password" placeholder="Enter your new password" required />
	              <button type="submit">Complete Signup</button>
	            </form>
	          </div>
	        </body>
	      </html>
	    `);
	
	  } catch (err) {
	    return res.status(500).json({
	    			    status: 500,
	    			    error: "Something went wrong.",
	    			  });
	  }
	},


async completeSignupP (req, res){
  const token = req.params.token;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
    status:400,
    error:'Password is required.'
    });
  }

  try {
    const result = await db.query(
      `SELECT id, token_expires FROM admins WHERE signup_token = $1`,
      [token]
    );

    if (result.length === 0) {
      return res.status(404).send('Invalid or expired signup link.');
    }

    const admin = result[0];

    if (new Date(admin.token_expires) < new Date()) {
      return res.status(410).send('Signup link has expired.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const bool = process.env.PROJECT_TYPE ==="prod" ? true :  1;
 
    await db.query(
      `UPDATE admins
       SET password_hash = $1,
           signup_token = NULL,
           token_expires = NULL,
           is_verified = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [hashedPassword,bool, admin.id]
    );

    res.status(200).json({
    status:200,
    message:'Signup completed successfully! You can now log in.'
   });

  } catch (err) {
  console.error(err);
  return res.status(500).json({
  			    status: 500,
  			    error: "Something went wrong.",
  			  });
  }
},
	async removeAdmin(req,res){
			const id  = req.params.id;
			
			if(!id){
				return res.status(400).json({
					status:400,
					error:"Id is required"
				})
				}
				const results = await db.query("SELECT * FROM admins WHERE id = $1",[id])
				if(results.length === 0){ 
					res.status(404).json({
						status:404,
						error:`User with id ${id} not Found`
					})
					return;
				}
				try{
					await db.query("DELETE FROM admins WHERE ID = $1",[id]);
					res.status(200).json({
						status:200,
						message:`Successfully Deleted user with ID ${id}`
					}) 
				} catch(error){
					res.status(500).json({
						status:500,
						error:"Something went wrong"
					})
				}
		},
	
		async viewAllAdmins(req,res){
			try{
				const results = await db.query("SELECT id,name,email,is_verified,created_at FROM admins");
				if(results.length=== 0){
					res.status(404).json({
						status:404,
						error:"Users Not Found"
					})
					return;
				}
				res.json({
					status:200,
					results
				})
			} catch(error){
				res.status(500).json({
					status:500,
					error:"Something went Wrong"
				})
			} 
		},
		async viewOneAdmin(req,res){
		const {id} = req.params;
		if(!id){
			return res.status(400).json({
				status:400,
				error:"ID is required"
			})
		}
			const results = await db.query("SELECT id,name,email,created_at,signup_token,is_verified FROM admins WHERE id = $1",[id]);
			if(results.length === 0){
				return res.status(404).json({
					status:404,
					error:`User with ID ${id} Not Found`  
				})
			}
			try{
				res.status(200).json({
					status:200,
					results
				})
			} catch(error){
				res.status(500).json({
							status:500,
							error:"Something went Wrong"
							})
			}
		},
		async superAdminDash(req, res) {
		  try {
		    const trueBool = process.env.PROJECT_TYPE === "prod" ? true : 1;
		    const falseBool = process.env.PROJECT_TYPE === "prod" ? false : 0;
		
		    const totalVerified = await db.query("SELECT * FROM admins WHERE is_verified = $1", [trueBool]);
		    const notVerified = await db.query("SELECT * FROM admins WHERE is_verified = $1", [falseBool]);
		
		    // Fetch first 3 admins (adjust the query if needed)
		    const firstThreeAdmins = await db.query("SELECT name,email FROM admins ORDER BY created_at ASC LIMIT 3");
		
		    res.json({
		      verified: totalVerified.length,
		      notVerified: notVerified.length,
		      banned: 0,
		      firstThreeAdmins: firstThreeAdmins // <-- add this here
		    });
		  } catch (err) {
		    console.error(err);
		    res.status(500).json({
		      status: 500,
		      error: "Something went wrong",
		    });
		  }
		}
		
	}
	module.exports = superAdminFunctions;
