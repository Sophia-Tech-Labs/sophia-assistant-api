const express = require("express");
const rateLimit = require('express-rate-limit');
const router = express.Router();
const supAdmFn  = require("../controllers/superAdminController");
const superAdminMd = require("../middlewares/authMiddleware.js");
const {superAdminResetPassword, superAdminForgotPassword} = require("../lib/test");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // limit each IP to 5 login attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true, 
  legacyHeaders: false,
});
router.post("/forgot-password",loginLimiter,superAdminForgotPassword);
router.post("/reset-password",loginLimiter,superAdminResetPassword);
router.post("/login",loginLimiter,supAdmFn.superAdminLogin);
router.post("/signup",loginLimiter,supAdmFn.superAdminSignup);
router.get("/dashboard",superAdminMd.verifySuperAdmin,supAdmFn.superAdminDash);
router.post("/invite-admin",superAdminMd.verifySuperAdmin,supAdmFn.inviteAdmin);
router.post("/activate-premium",superAdminMd.verifySuperAdmin, supAdmFn.becomePremiumMember);
router.post("/deactivate-premium/:id",superAdminMd.verifySuperAdmin,supAdmFn.deactivatePremium);
router.delete("/remove-admin/:id",superAdminMd.verifySuperAdmin,supAdmFn.removeAdmin);
router.get("/view-all-admins",superAdminMd.verifySuperAdmin,supAdmFn.viewAllAdmins);
router.get("/view-all-users",superAdminMd.verifySuperAdmin,supAdmFn.viewAllUsers);
router.get("/view-one-admin/:id",superAdminMd.verifySuperAdmin,supAdmFn.viewOneAdmin);
module.exports = router;
