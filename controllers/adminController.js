const db = require("../db/db.js");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const admCodeValidityTime = process.env.admCodeValidity || 300;
const admCodeDeleteTime = process.env.admCodeDeleteTime || 1000;
let doesFileExist;
async function cJIIDNE() {
  try {
    doesFileExist =  fs.readFileSync("../adm/admCodes.json", "utf8");
  
  } catch (error) {
    console.log(error)
  }
  if (!doesFileExist) {
    
    const admJsonPth = path.resolve(__dirname, "../adm/admCodes.json");
    const iniVal = "[]";
    fs.mkdir(path.dirname(admJsonPth), { recursive: true }, (error) => {
      if (error) {
        cJIIDNE();
        return;
      }
    
      fs.writeFile(admJsonPth, iniVal, (error) => {
        if (error) {
          console.log(error);
          cJIIDNE();
        } else {
          return;
        }
      });
    
      return
    });
    }


}

const AdminLogin = {
  async AdminLogin(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: 400,
        error: "All field are required(email,password)",
      });
       
    }
        

    const user = await db.query("SELECT * FROM admins WHERE email = $1", [email]);
    if (!user[0]) {
      res.status(401).json({
        status: 401,
        error: "Invalid email or password",
      });
      return;
    }
    const hashedPassword = user[0].password_hash;
    const isPasswordValid = bcrypt.compareSync(
      password,
      hashedPassword
    );
    if (!isPasswordValid) {
      res.status(401).json({
        status: 401,
        error: "Invalid email or password",
      });
      return;
    }
    try {
      const accessToken = jwt.sign(
        {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          role: "admin",
        },
        process.env.JWT_SECRET||"abc",
        { expiresIn: process.env.JWT_EXPIRIES_IN || "15m" }
      );
      const refreshToken = jwt.sign(
        {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          role: "admin",
        },
        process.env.JWT_SECRET||"abc",
        { expiresIn: process.env.JWT_EXPIRIES_IN || "7d" }
      );
      let bool;
      if (process.env.PROJECT_TYPE === "prod") {
        bool = true;
      } else {
        bool = false;
      }
      res.cookie("accessToken", accessToken, {
        httpOnly: true, // 👉 Client JS can't access it
        secure: bool || true, // true in production (with HTTPS)
        sameSite: "lax", // Can be 'strict' | 'lax' | 'none'
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: bool || true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.json({
        status: 200,
        message: "logged In successfully",
        user: {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
        },
      });

      return;
    } catch (error) {
                res.status(500).json({
                  status: 500,
                  error: "Something went wrong",
                });
              
          }
  },
};
const adminCode = {
  //Generates Admin Codes
  async adminCodeG(res) {
    
    try {
      const rawAdmCodes = fs.readFileSync("../adm/admCodes.json", "utf8");
      const adminCodes = JSON.parse(rawAdmCodes);
      const code = Math.floor(100000 + Math.random() * 900000);
      const creationTime = new Date();
      adminCodes.push({ admCode: code, creationTime: creationTime, validity: true })
    
      fs.writeFileSync("../adm/admCodes.json", JSON.stringify(adminCodes, null, 2));
    } catch(error) {
      res.json({
        status: 401,
        error: error,
      });
    }
  },
  //Checks Admin Codes Validity
  async adminCodeV(code,res) {
    const rawC = fs.readFileSync("../adm/admCodes.json", "utf8");
    const admCodeArray = JSON.parse(rawC);
for (let i = 0; i < admCodeArray.length; i++) {
  const currentAdmCode = admCodeArray[i].admCode;
  const currentAdmCodeV = admCodeArray[i].validity;
  if (currentAdmCode == code) {
    if (!currentAdmCodeV) {
      res.json({
        status: 401,
        message: "The Code Is No Longer Valid",
        isValid: "false",
      });
      return;
    }
    console.log("Valid Code")
    res.json({
      status: 200,
      message: "The Code Is Valid",
      isValid: "true",
    });
    return;
  }
  res.json({
    status: 401,
    message: "The Code Dosen't Exist",
    isValid: "false",
  });
}
  },
  //Sets If The Code Is Valid Or Not
  async setValidity() {
    const rawCForV = fs.readFileSync("../adm/admCodes.json", "utf8");
    const admCodeArrayV = JSON.parse(rawCForV);
    for (let i = 0; i < admCodeArrayV.length; i++) {
      const currentAdmCodeT = new Date(admCodeArrayV[i].creationTime);
      const currentTime = new Date();
      const diffInMs = currentTime - currentAdmCodeT; // Difference in milliseconds
      const diffInSeconds = Math.floor(diffInMs / 1000); // Convert to seconds
      //Makes The Code Invalid After Some Time
      if (diffInSeconds >= admCodeValidityTime) {
        admCodeArrayV[i].validity = false;
        fs.writeFileSync(
          "../adm/admCodes.json",
          JSON.stringify(admCodeArrayV, null, 2)
        );
      }
      //Delets The Code From The Db  cv After Some Time
      if (diffInSeconds >= admCodeDeleteTime) {
        admCodeArrayV.splice(i, 1);
        fs.writeFileSync(
          "../adm/admCodes.json",
          JSON.stringify(admCodeArrayV, null, 2)
        );
      }
    }
  }
}
  
cJIIDNE()
module.exports = { AdminLogin, adminCode};
