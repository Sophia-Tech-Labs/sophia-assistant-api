const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController")
//Routes…

router.get("/",auth.login);
router.get("/post",auth.signup);

module.exports = router;
