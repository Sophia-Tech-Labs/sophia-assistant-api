const jwt = require("jsonwebtoken");
const db = require("../db/db");

const authController = {
  async refreshToken(req, res) {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        status: 400,
        error: "Refresh Token Required",
      });
    }

    const refreshToken = authHeader.split(' ')[1];
  
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
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

      res.status(200).json({
        status: 200,
        accessToken,
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
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        status: 400,
        error: "Access Token Required in Authorization header",
      });
    }

    const accessToken = authHeader.split(' ')[1];
  
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
    // No cookies to clear anymore, client handles token removal
    res.status(200).json({
      status: 200,
      message: "Logged out successfully (Client should remove tokens from storage)",
    });
  },
};

module.exports = authController;