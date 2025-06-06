const express = require("express");
const router = express.Router();
const supAdmFn  = require("../controllers/superAdminController");
router.post("/signup",supAdmFn.superAdminSignup);

module.exports = router;
