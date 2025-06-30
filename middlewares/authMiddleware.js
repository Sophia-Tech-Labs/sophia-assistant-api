const jwt = require("jsonwebtoken");

const middlewares = {
  async verifySuperAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No access token provided. Access denied."
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedUser;

      if (decodedUser.role !== "super-admin") {
        return res.status(401).json({
          status: 401,
          error: "Access denied"
        });
      }

      next();
    } catch (error) {
      res.status(403).json({
        status: 403,
        error: "Invalid or expired token"
      });
    }
  },

  async verifyAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No access token provided. Access denied."
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedUser;

      if (decodedUser.role !== "admin") {
        return res.status(401).json({
          status: 401,
          error: "Access denied"
        });
      }

      next();
    } catch (error) {
      res.status(403).json({
        status: 403,
        error: "Invalid or expired token"
      });
    }
  },

  async verifyUser(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No access token provided. Access denied."
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedUser;

      if (decodedUser.role !== "user") {
        return res.status(401).json({
          status: 401,
          error: "Access denied"
        });
      }

      next();
    } catch (error) {
      res.status(403).json({
        status: 403,
        error: "Invalid or expired token"
      });
    }
  }
};

module.exports = middlewares;
