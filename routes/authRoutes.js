const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
router.post("/refresh-token",authController.refreshToken)
router.post("/check-token",authController.checkToken)
router.post("/logout",authController.logOut)

module.exports = router
