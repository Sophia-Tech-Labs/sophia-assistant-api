const db = require("../db/db.js");
const bcrypt = require("bcryptjs");

const AdminLogin = {
  async AdminLogin(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: 400,
        error: "All field are required(email,password)",
      });
       
    }
        

    const user = await db.query("SELECT * FROM admins WHERE email = $1", [email]);
    if (!user[0]) {
      res.status(401).json({
        status: 401,
        error: "Invalid email or password",
      });
      return;
    }
    const hashedPassword = user[0].password_hash;
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
          role: "admin",
        },
        process.env.JWT_SECRET||"abc",
        { expiresIn: process.env.JWT_EXPIRIES_IN || "15m" }
      );
      const refreshToken = jwt.sign(
        {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          role: "admin",
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
  },
async adminCodeG(req, res){
  try {
    // Generate 8-char uppercase alphanumeric code
    const code = [...Array(8)]
      .map(() => Math.random().toString(36)[2])
      .join('')
      .toUpperCase();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes later
if(process.env.PROJECT_TYPE === "prod"){
  await db.query(
      `INSERT INTO admin_codes (adm_codes, creation_time, expires_at, validity)
       VALUES (?, ?, ?,false)`,
      [code, now.toISOString(), expiresAt.toISOString()]
    );
} else {
    await db.query(
      `INSERT INTO admin_codes (adm_codes, creation_time, expires_at, validity)
       VALUES (?, ?, ?, 0)`,
      [code, now.toISOString(), expiresAt.toISOString()]
    );
}
    res.status(201).json({
      status:201,
      message: "Admin code generated",
      code,
      expires_in: "5 minutes"
    });

  } catch (error) {
    res.status(500).json({
      status:500,
      message: "Failed to generate code"
    });
  }
}
};
module.exports = AdminLogin
