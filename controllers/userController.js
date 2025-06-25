const db = require("../db/db.js");  
const bcrypt = require("bcryptjs");  
const jwt = require("jsonwebtoken");  

const userSignup = async (req, res) => {
  const { name, email, password, mainPhone, assistantPhone, adminCode } = req.body;

  // Check if all required fields are present
  if (!name || !email || !password || !mainPhone || !assistantPhone || !adminCode) {
    return res.status(400).json({ status: 400, error: "All fields are required" });
  }

  try {
  const emailCheck = await db.query("SELECT id FROM users WHERE email = $1",[email])
  if(emailCheck.length > 0){
  	return res.status(409).json({
  		status:409,
  		error:"User With This Email Already Exists"
  	})
  }
  
    const codeResult = await db.query("SELECT * FROM admin_codes WHERE adm_codes = $1", [adminCode]);
    
    if (codeResult.length === 0) {
      return res.status(404).json({ status: 404, error: "Admin code not found" });
    }

    const adminCodeData = codeResult[0];

   const now = new Date();
   const expiredAt = new Date(adminCodeData.expires_at);
   if(now > expiredAt){
   await db.query("DELETE FROM admin_codes WHERE adm_codes = $1",[adminCode])
   	return res.status(403).json({
   		status:403,
   		error:"Admin Code expired"
   	})
   }
   if(adminCodeData.validity === false){ 
   await db.query("DELETE FROM admin_codes WHERE adm_codes = $1",[adminCode])
   	   	return res.status(403).json({
   	   		status:403,
   	   		error:"Admin Code expird"
   	   	})
   	   }
   const hashedPassword = await bcrypt.hash(password,10);
    const sqlQuery = `INSERT INTO users (name, email,password, main_phone, assistant_phone, admin_code) 
                      VALUES ($1, $2, $3, $4, $5, $6)`;

    await db.query(sqlQuery, [name, email, hashedPassword, mainPhone, assistantPhone, adminCode]);

    res.status(201).json({
      status: 201,
      message: "User signed up successfully"
    });
     await db.query("DELETE FROM admin_codes WHERE adm_codes = $1",[adminCode])
    }
  catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Something went wrong", error: error.message });
  }
};

async function userLogin(){
	const { email, password } = req.body;
	    if (!email || !password) {
	      return res.status(400).json({
	        status: 400,
	        error: "All field are required",
	      });
	       
	    }
	        
	
	    const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
	    if (!user[0]) {
	      res.status(401).json({
	        status: 401,
	        error: "Invalid email or password",
	      });
	      return;
	    }
	    const hashedPassword = user[0].password;
	    const isPasswordValid = bcrypt.compareSync(
	      password,
	      hashedPassword
	    );
	    if (!isPasswordValid) {
	      res.status(401).json({
	        status: 401,
	        error: "Invalid email or password",
	      });
	      return;
	    }
	    try {
	      const accessToken = jwt.sign(
	        {
	          id: user[0].id,
	          name: user[0].name,
	          email: user[0].email,
	          role: "user",
	        },
	        process.env.JWT_SECRET||"abc",
	        { expiresIn: process.env.JWT_EXPIRIES_IN || "15m" }
	      );
	      const refreshToken = jwt.sign(
	        {
	          id: user[0].id,
	          name: user[0].name,
	          email: user[0].email,
	          role: "user",
	        },
	        process.env.JWT_SECRET||"abc",
	        { expiresIn: process.env.JWT_EXPIRIES_IN || "7d" }
	      );
	      let bool;
	      if (process.env.PROJECT_TYPE === "prod") {
	        bool = true;
	      } else {
	        bool = false;
	      }
	      res.cookie("accessToken", accessToken, {
	        httpOnly: true, // 👉 Client JS can't access it
	        secure: bool || true, // true in production (with HTTPS)
	        sameSite: "lax", // Can be 'strict' | 'lax' | 'none'
	        maxAge: 15 * 60 * 1000, // 15 minutes
	      });
	
	      res.cookie("refreshToken", refreshToken, {
	        httpOnly: true,
	        secure: bool || true,
	        sameSite: "lax",
	        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	      });
	      res.json({
	        status: 200,
	        message: "logged In successfully",
	        user: {
	          id: user[0].id,
	          name: user[0].name,
	          email: user[0].email,
	        },
	      });
	
	      return;
	    } catch (error) {
	                res.status(500).json({
	                  status: 500,
	                  error: "Something went wrong",
	                });
	              
	          }
}
module.exports = { userSignup,userLogin };
