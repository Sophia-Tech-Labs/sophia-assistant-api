const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController")
const AdmLn = require("../controllers/adminController");
const superAdmFn = require("../controllers/superAdminController");
const rateLimit = require("express-rate-limit");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts, please try again later.",
});

//Routes…
router.post("/login", loginLimiter, AdmLn.AdminLogin);
router.post("/generate-admin-code",AdmLn.adminCodeG);
router.get("/complete-signup/:token",superAdmFn.completeSignupG);
router.post("/complete-signup/:token",superAdmFn.completeSignupP);
module.exports = router;
