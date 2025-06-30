const db = require("../db/db.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AdminLogin = {
	async AdminLogin(req, res) {
	  const { email, password } = req.body;
	  if (!email || !password) {
	    return res.status(400).json({ status: 400, error: "All fields are required" });
	  }
	  const user = await db.query("SELECT * FROM admins WHERE email = $1", [email]);
	  if (!user[0]) {
	    return res.status(401).json({ status: 401, error: "Invalid email or password" });
	  }
	
	  const isMatch = await bcrypt.compare(password, user[0].password_hash);
	  if (!isMatch) {
	    return res.status(401).json({ status: 401, error: "Invalid email or password" });
	  }
	
	  try {
	    const payload = {
	      id: user[0].id,
	      name: user[0].name,
	      email: user[0].email,
	      role: "admin",
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
	},
async adminCodeG(req, res) {
  try {
    const adminId = req.user?.id; // assume JWT middleware adds user
    if (!adminId) {
      return res.status(401).json({
        status: 401,
        error: "Unauthorized – Admin ID missing",
      });
    }

    const code = [...Array(8)]
      .map(() => Math.random().toString(36)[2])
      .join("")
      .toUpperCase();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins

    const validityValue = process.env.PROJECT_TYPE === "prod" ? false : 0;

    await db.query(
      `INSERT INTO admin_codes (adm_codes, creation_time, expires_at, validity, admin_id)
       VALUES (?, ?, ?, ?, ?)`,
      [code, now.toISOString(), expiresAt.toISOString(), validityValue, adminId]
    );

    res.status(201).json({
      status: 201,
      code,
      expires_in: "10 minutes",
      message: "Admin code generated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: "Failed to generate admin code",
    });
  }
}
};
module.exports = AdminLogin
