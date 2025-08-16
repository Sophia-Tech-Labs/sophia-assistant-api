const db = require("../db/db.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function generateApiKey() {
  const randomPart = crypto.randomBytes(24).toString("hex"); // 48 characters
  return `sophia_${randomPart}`;
}

const userSignup = async (req, res) => {
  const { name, email, password, mainPhone, assistantPhone, adminCode } =
    req.body;

  if (
    !name ||
    !email ||
    !password ||
    !mainPhone ||
    !assistantPhone ||
    !adminCode
  ) {
    return res
      .status(400)
      .json({ status: 400, error: "All fields are required" });
  }

  try {
    // 1. Check for duplicate user
    const emailCheck = await db.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (emailCheck.length > 0) {
      return res.status(409).json({
        status: 409,
        error: "User with this email already exists",
      });
    }

    // 2. Find and validate admin code
    const codeResult = await db.query(
      "SELECT * FROM admin_codes WHERE adm_codes = $1",
      [adminCode]
    );
    if (codeResult.length === 0) {
      return res
        .status(404)
        .json({ status: 404, error: "Admin code not found" });
    }

    const adminCodeData = codeResult[0];
    const now = new Date();
    const expiredAt = new Date(adminCodeData.expires_at);
    console.log(now);
    console.log(expiredAt)
    console.log(adminCodeData.expires_at);
    if (now > expiredAt || adminCodeData.validity === false) {
      await db.query("DELETE FROM admin_codes WHERE adm_codes = $1", [
        adminCode,
      ]);
      return res.status(403).json({
        status: 403,
        error: "Admin code expired or invalid",
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Get admin ID from code row
    const adminId = adminCodeData.admin_id;

    // 5. Insert user with `admin_id`
    const insertQuery = `
      INSERT INTO users (name, email, password, main_phone, assistant_phone, admin_code, admin_id, api_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7,$8)
    `;
    const sophiaApiKey = generateApiKey();
    await db.query(insertQuery, [
      name,
      email,
      hashedPassword,
      mainPhone,
      assistantPhone,
      adminCode,
      adminId,
      sophiaApiKey,
    ]);

    // 6. Delete the used code
    await db.query("DELETE FROM admin_codes WHERE adm_codes = $1", [adminCode]);

    // 7. Done 🎉
    res.status(201).json({
      status: 201,
      message: "User signed up successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

async function userLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ status: 400, error: "All fields are required" });
  }

  const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  if (!user[0]) {
    return res
      .status(401)
      .json({ status: 401, error: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user[0].password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ status: 401, error: "Invalid email or password" });
  }

  try {
    const payload = {
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      role: "user",
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("accessToken", accessToken, {
      httpOnly: true, // Can't be accessed by JS (prevents XSS)
      secure: process.env.PROJECT_TYPE === "prod", // Only sent over HTTPS
      sameSite: "none", // Controls cross-site sending
      maxAge: 17 * 60 * 1000, // 15 mins (in milliseconds)
      path: "/",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Can't be accessed by JS (prevents XSS)
      secure: process.env.PROJECT_TYPE === "prod", // Only sent over HTTPS or http
      sameSite: "none", // Controls cross-site sending
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (in milliseconds)
      path: "/auth/refresh-token",
    });
    res.json({
      status: 200,
      message: "Logged In successfully",
    });
  } catch (error) {
    res.status(500).json({ status: 500, error: "Something went wrong" });
  }
}
async function userDashboard(req, res) {
  try {
    const info = await db.query("SELECT * FROM users WHERE id = $1", [
      req.user.id,
    ]);

    // Fetch first 3 admins (adjust the query if needed)
    res.json({
      botStatus: {
        isLinked: Boolean(info[0].is_linked),
        status: info[0].status,
        lastConnected: info[0].last_connected,
        botName: info[0].bot_name,
      },
      userInfo: {
        name: info[0].name,
        email: info[0].email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      error: "Something went wrong",
    });
  }
}

 async function getApiKey(req,res) {
    try{
      const apiKey = await db.query("SELECT api_key FROM users WHERE id = $1",[req.user.id]);
      res.json({
        apiKey:apiKey[0].api_key
      })
    } catch(error){
      console.error(error)
      res.status(500).json({
        status:500,
        error:"An error Occured"
      })
    }
  }
module.exports = { userSignup, userLogin, userDashboard,getApiKey };
