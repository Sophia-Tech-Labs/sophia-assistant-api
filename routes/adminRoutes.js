const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const middleware = require("../middlewares/authMiddleware");
const AdmLn = require("../controllers/adminController");
const superAdmFn = require("../controllers/superAdminController");
const rateLimit = require("express-rate-limit");
const { adminForgotPassword, adminResetPassword } = require("../lib/test");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts",
    message: "Please try again later.",
    retryAfter: "15 minutes"
  }
});
//Routes…
router.post("/forgot-password", loginLimiter, adminForgotPassword);
router.post("/login", loginLimiter, AdmLn.AdminLogin);
router.post("/reset-password", loginLimiter, adminResetPassword);
router.post("/generate-admin-code",middleware.verifyAdmin,AdmLn.adminCodeG);
router.post("/dashboard",middleware.verifyAdmin,AdmLn.AdminDash);
router.get("/complete-signup/:token",superAdmFn.completeSignupG);
router.post("/complete-signup/:token",superAdmFn.completeSignupP);
module.exports = router;
