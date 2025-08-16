const express = require("express");
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { userSignup,userLogin, userDashboard, getApiKey } = require("../controllers/userController");
const { pairCodeG, getBotStatus } = require("../controllers/botController")
const middleware = require("../middlewares/authMiddleware")
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // limit each IP to 5 login attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true, 
  legacyHeaders: false,
});
const { userForgotPassword,userResetPassword } = require("../lib/test");
router.post("/signup",loginLimiter,userSignup);
router.post("/api-key",middleware.verifyUser,getApiKey)
router.post("/login",loginLimiter,userLogin);
router.post("/dashboard",middleware.verifyUser,userDashboard);
router.post("/forgot-password",loginLimiter,userForgotPassword);
router.post("/reset-password",loginLimiter,userResetPassword);
router.post("/pair",middleware.verifyUser,pairCodeG);
router.post("/bot-status",middleware.verifyUser,getBotStatus);

module.exports = router
