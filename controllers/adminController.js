const db = require("../db/db.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AdminLogin = {
  async AdminLogin(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: 400, error: "All fields are required" });
    }
    const user = await db.query("SELECT * FROM admins WHERE email = $1", [
      email,
    ]);
    if (!user[0]) {
      return res
        .status(401)
        .json({ status: 401, error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user[0].password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: 401, error: "Invalid email or password" });
    }

    try {
      const payload = {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        role: "admin",
      };
      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "15m",
      });
      const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      const sameSiteFix = process.env.PROJECT_TYPE === "prod" ? "none" : "lax"
      res.cookie("accessToken", accessToken, {
        httpOnly: true, // Can't be accessed by JS (prevents XSS)
        secure: process.env.PROJECT_TYPE === "prod", // Only sent over HTTPS
        sameSite: sameSiteFix, // Controls cross-site sending
        maxAge: 17 * 60 * 1000, // 15 mins (in milliseconds)
        path: "/",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true, // Can't be accessed by JS (prevents XSS)
        secure: process.env.PROJECT_TYPE === "prod", // Only sent over HTTPS or http
        sameSite: sameSiteFix, // Controls cross-site sending
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (in milliseconds)
        path: "/auth/refresh-token",
      });
      res.json({
        status: 200,
        message: "Logged In successfully",
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
      expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      const validityValue = process.env.PROJECT_TYPE === "prod" ? false : 0;

      await db.query(
        `INSERT INTO admin_codes (adm_codes, creation_time, expires_at, validity, admin_id)
       VALUES ($1, $2, $3, $4, $5)`,
        [
          code,
          now.toISOString(),
          expiresAt,
          validityValue,
          adminId,
        ]
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
  },

  async AdminDash(req, res) {
    try {
      const trueBool = process.env.PROJECT_TYPE === "prod" ? true : 1;
      const falseBool = process.env.PROJECT_TYPE === "prod" ? false : 0;
      const totalLinked = await db.query(
        "SELECT * FROM users WHERE is_linked = $1 AND admin_id = $2",
        [trueBool, req.user.id]
      );
      const notLinked = await db.query(
        "SELECT * FROM users WHERE is_linked = $1 AND admin_id = $2",
        [falseBool, req.user.id]
      );
      const firstThreeUsers = await db.query(
        "SELECT name,email FROM users WHERE admin_id = $1 ORDER BY created_at ASC LIMIT 3",
        [req.user.id]
      );
      // Fetch first 3 admins (adjust the query if needed)

      const totalUsers = await db.query("SELECT COUNT(*) as count from users");
      res.json({
        totalUsers: totalUsers[0].count,
        linked: totalLinked.length,
        notLinked: notLinked.length,
        recentUsers: firstThreeUsers,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: 500,
        error: "Something went wrong",
      });
    }
  },
};
module.exports = AdminLogin;
