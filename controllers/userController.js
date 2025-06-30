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
async function userLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: 400, error: "All fields are required" });
  }

  const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  if (!user[0]) {
    return res.status(401).json({ status: 401, error: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user[0].password);
  if (!isMatch) {
    return res.status(401).json({ status: 401, error: "Invalid email or password" });
  }

  try {
    const payload = {
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      role: "user",
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
    res.status(500).json({ status: 500, error: "Something went wrong" });
  }
}
module.exports = { userSignup,userLogin };
