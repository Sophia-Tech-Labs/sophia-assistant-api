const express = require("express");
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { userSignup,userLogin, userDashboard, getApiKey, premiumUserDashboard, getPhoneNumber } = require("../controllers/userController");
const { pairCodeG, getBotStatus, generateQRCode, resetBotConnection } = require("../controllers/botController")
const middleware = require("../middlewares/authMiddleware")
const { userForgotPassword,userResetPassword } = require("../lib/test");
const { mainPairCodeG, generateMainQRCode, resetPremiumBotConnection, getPremiumBotStatus } = require("../controllers/premiumBotController");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // limit each IP to 5 login attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true, 
  legacyHeaders: false,
});

router.post("/signup",loginLimiter,userSignup);
router.post("/api-key",middleware.verifyUser,getApiKey)
router.post("/login",loginLimiter,userLogin);
router.post("/dashboard",middleware.verifyUser,userDashboard);
router.post("/premium-dashboard",middleware.verifyUser,premiumUserDashboard);
router.post("/forgot-password",loginLimiter,userForgotPassword);
router.post("/reset-password",loginLimiter,userResetPassword);
router.post("/pair",middleware.verifyUser,pairCodeG);
router.post("/qr-code",middleware.verifyUser,generateQRCode);
router.post("/reset-bot",middleware.verifyUser,resetBotConnection);
router.post("/bot-status",middleware.verifyUser,getBotStatus);
router.post("/get-phone",middleware.verifyUser,getPhoneNumber);
router.post("/premium-pair",middleware.verifyUser,mainPairCodeG);
router.post("/premium-qr-code",middleware.verifyUser,generateMainQRCode);
router.post("/reset-premium-bot",middleware.verifyUser,resetPremiumBotConnection);
router.post("/premium-bot-status",middleware.verifyUser,getPremiumBotStatus);

module.exports = router
