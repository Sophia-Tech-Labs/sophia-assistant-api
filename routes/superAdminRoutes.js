const express = require("express");
const rateLimit = require('express-rate-limit');
const router = express.Router();
const supAdmFn  = require("../controllers/superAdminController");
const superAdminMd = require("../middlewares/authMiddleware.js")
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // limit each IP to 5 login attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true, 
  legacyHeaders: false,
});
router.post("/signup",loginLimiter,supAdmFn.superAdminSignup);
router.post("/login",loginLimiter,supAdmFn.superAdminLogin);
router.post("/invite-admin",superAdminMd.verifySuperAdmin,supAdmFn.inviteAdmin);
router.delete("/remove-admin/:id",superAdminMd.verifySuperAdmin,supAdmFn.removeAdmin);
router.get("/view-all-admins",superAdminMd.verifySuperAdmin,supAdmFn.viewAllAdmins);
router.get("/protect",superAdminMd.verifySuperAdmin,(req,res)=>{
	res.send(`
	<body>
	<h1>hello, ${req.user.name} </h1>
	<h1> You are a ${req.user.role} </h1>  
</body>
	`)
})
module.exports = router;
