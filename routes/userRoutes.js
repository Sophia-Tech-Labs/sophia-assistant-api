const express = require("express");
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { userSignup,userLogin } = require("../controllers/userController");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // limit each IP to 5 login attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true, 
  legacyHeaders: false,
});
const { userForgotPassword,userResetPassword } = require("../lib/test");
router.post("/signup",loginLimiter,userSignup);
router.post("/login",loginLimiter,userLogin);
router.post("/forgot-password",loginLimiter,userForgotPassword);
router.post("/reset-password",loginLimiter,userResetPassword);

module.exports = router
