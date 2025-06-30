const jwt = require("jsonwebtoken");

const authController = {
  async refreshToken(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        status: 400,
        error: "Refresh Token Required in Authorization header",
      });
    }

    const refreshToken = authHeader.split(" ")[1]; // Get token after "Bearer"

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      const accessToken = jwt.sign(
        {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.status(200).json({
        status: 200,
        role: decoded.role,
        accessToken, // return new access token in body
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

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        status: 400,
        error: "Access Token Required in Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.status(200).json({
        status: 200,
        role: decoded.role,
        message: "Token Verified",
      });
    } catch (error) {
      res.status(403).json({
        status: 403,
        error: "Token Invalid or Expired",
        codeError: error.message,
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
