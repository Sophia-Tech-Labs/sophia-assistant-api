const express = require('express');
const router = express.Router();
const db = require('../db/db'); 
const crypto = require("crypto");
const sendEmail = require('../lib/email'); 
async function userForgotPassword(req, res){
  const { email } = req.body;

  try {
    if(!email){
    	return res.status(401).json({
    		status:401,
    		error:"All fields are required"
    	})
    }
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.length === 0) {
      return res.status(404).json({
      status:404, 
      error: 'No user with that email' 
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 15); // 15 minutes

    // 2. Save token + expiry to user row
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [token, expiresAt.toISOString(), email]
    );

    const resetLink = `https://yourfrontend.com/reset-password/?token=${token}`;
    const subject = 'Reset Your Password';
    const message = `Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 15 minutes.`;

    // 3. Send the email
    await sendEmail(email, subject, message);

    res.json({ 
    status:200,
    message: 'Reset link sent to your email'
     });
  } catch (err) {
    res.status(500).json({
    status:500, 
    error: 'Something went wrong' });
  }
}

async function userResetPassword(req,res) {
  const { token, newPassword } = req.body;

  try {
    const now = new Date();
    const userResult = await db.query(
      'SELECT * FROM users WHERE reset_token = $1',
      [token]
    );

    if (userResult.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const tokenExpires = new Date(userResults[0].reset_token_expires);
    if(now > tokenExpires){
    	res.status(403).json({
    		status:403,
    		error:"Token expired"
    	})
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 2. Update password and remove token
    await db.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = $2',
      [hashedPassword, token]
    );

    res.status(200).json({ 
    status:200,
    message: 'Password has been reset' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
async function adminForgotPassword(req, res){
  const { email } = req.body;

  try {
    if(!email){
    	return res.status(401).json({
    		status:401,
    		error:"All fields are required"
    	})
    }
    const userResult = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (userResult.length === 0) {
      return res.status(404).json({
      status:404, 
      error: 'No admin with that email' 
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 15); // 15 minutes

    // 2. Save token + expiry to user row
    await db.query(
      'UPDATE admins SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [token, expiresAt.toISOString(), email]
    );

    const resetLink = `https://yourfrontend.com/reset-password/?token=${token}`;
    const subject = 'Reset Your Password';
    const message = `Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 15 minutes.`;

    // 3. Send the email
    await sendEmail(email, subject, message);

    res.json({ 
    status:200,
    message: 'Reset link sent to your email'
     });
  } catch (err) {
    res.status(500).json({
    status:500, 
    error:err.message
     });
  }
}

async function adminResetPassword(req,res) {
  const { token, newPassword } = req.body;

  try {
    const now = new Date();
    const userResult = await db.query(
      'SELECT * FROM admins WHERE reset_token = $1',
      [token]
    );

    if (userResult.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const tokenExpires = new Date(userResults[0].reset_token_expires);
    if(now > tokenExpires){
    	res.status(403).json({
    		status:403,
    		error:"Token expired"
    	})
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 2. Update password and remove token
    await db.query(
      'UPDATE admins SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = $2',
      [hashedPassword, token]
    );

    res.status(200).json({ 
    status:200,
    message: 'Password has been reset' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
async function superAdminForgotPassword(req, res){
  const { email } = req.body;

  try {
    if(!email){
    	return res.status(401).json({
    		status:401,
    		error:"All fields are required"
    	})
    }
    const userResult = await db.query('SELECT * FROM super_admins WHERE email = $1', [email]);
    if (userResult.length === 0) {
      return res.status(404).json({
      status:404, 
      error: 'No user with that email' 
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 15); // 15 minutes
 // 15 minutes

    // 2. Save token + expiry to user row
    await db.query(
      'UPDATE super_admins SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [token, expiresAt, email]
    );

    const resetLink = `https://yourfrontend.com/reset-password/?token=${token}`;
    const subject = 'Reset Your Password';
    const message = `Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 15 minutes.`;

    // 3. Send the email
    await sendEmail(email, subject, message);

    res.json({ 
    status:200,
    message: 'Reset link sent to your email'
     });
  } catch (err) {
    res.status(500).json({
    status:500, 
    error: 'Something went wrong' });
  }
}

async function superAdminResetPassword(req,res) {
  const { token, newPassword } = req.body;

  try {
    const now = new Date();
    const userResult = await db.query(
      'SELECT * FROM super_admins WHERE reset_token = $1',
      [token]
    );

    if (userResult.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const tokenExpires = new Date(userResults[0].reset_token_expires);
    if(now > tokenExpires){
    	res.status(403).json({
    		status:403,
    		error:"Token expired"
    	})
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 2. Update password and remove token
    await db.query(
      'UPDATE super_admins SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = $2',
      [hashedPassword, token]
    );

    res.status(200).json({ 
    status:200,
    message: 'Password has been reset' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};



module.exports ={ superAdminForgotPassword,superAdminResetPassword,adminForgotPassword,adminResetPassword,userForgotPassword,userResetPassword }
