const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
router.post("/refresh-token",authController.refreshToken)
router.post("/check-token",authController.checkToken)

module.exports = router
