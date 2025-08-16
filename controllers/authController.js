const jwt = require("jsonwebtoken");
const db = require("../db/db");
const authController = {
  async refreshToken(req, res) {
    const authHeader = req.cookies?.refreshToken;
  
    if (!authHeader) {
      return res.status(400).json({
        status: 400,
        error: "Refresh Token Required",
      });
    }
  
  
    try {
      const decoded = jwt.verify(authHeader, process.env.JWT_SECRET);
      const { id, role } = decoded;
  
      // Role-based DB check
      let userQuery;
      if (role === "user") {
        userQuery = await db.query("SELECT id FROM users WHERE id = $1", [id]);
      } else if (role === "admin") {
        userQuery = await db.query("SELECT id FROM admins WHERE id = $1", [id]);
      } else if (role === "super-admin") {
        userQuery = await db.query("SELECT id FROM super_admins WHERE id = $1", [id]);
      } else {
        return res.status(403).json({
          status: 403,
          error: "Invalid Role",
        });
      }
  
      if (userQuery.length === 0) {
        return res.status(404).json({
          status: 404,
          error: "User not found",
        });
      }
  
      // Issue new access token
      const accessToken = jwt.sign(
        {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role,
        },

        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
  res.cookie("accessToken", accessToken, {
        httpOnly: true, // Can't be accessed by JS (prevents XSS)
        secure: process.env.PROJECT_TYPE === "prod", // Only sent over HTTPS
        sameSite: "lax", // Controls cross-site sending
        maxAge: 17 *60 * 1000, // 15 mins (in milliseconds)
		path:"/"
      });
      res.status(200).json({
        status: 200,
        role
      });
  
    } catch (error) {
      res.status(403).json({
        status: 403,
        error: "Invalid Or Expired Refresh Token",
        codeError: error.message,
      });
    }
  },

  async checkToken(req, res) {
    const accessToken = req.cookies?.accessToken;
  
    if (!accessToken) {
      return res.status(400).json({
        status: 400,
        error: "Access Token Required in Authorization header",
      });
    }
  
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const { id, role } = decoded;
  
      // Role-based DB check
      let userQuery;
      if (role === "user") {
        userQuery = await db.query("SELECT id FROM users WHERE id = $1", [id]);
      } else if (role === "admin") {
        userQuery = await db.query("SELECT id FROM admins WHERE id = $1", [id]);
      } else if (role === "super-admin") {
        userQuery = await db.query("SELECT id FROM super_admins WHERE id = $1", [id]);
      } else {
        return res.status(403).json({
          status: 403,
          error: "Invalid Role",
        });
      }
  
      if (userQuery.length === 0) {
        return res.status(404).json({
          status: 404,
          error: "User not found",
        });
      }
  

      res.status(200).json({
        status: 200,
        role,
        message: "Token Verified and User Exists"
      });
  
    } catch (error) {
    	console.error(error);
      res.status(403).json({
        status: 403,
        error: "Token Invalid or Expired",
      });
    }
  },
  async logOut(req, res) {
    // No cookies to clear anymore
    res.status(200).json({
      status: 200,
      message: "Logged out successfully (Client should remove tokens from storage)",
    });
  },
};

module.exports = authController;
