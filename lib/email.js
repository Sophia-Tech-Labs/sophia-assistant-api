const nodemailer = require("nodemailer")

async function sendEmail(userEmail, subject,message){               const transporter = nodemailer.createTransport({
        service: "yahoo",
        auth:{
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.USER_EMAIL,
        to: userEmail,
        subject: "Verify Your Email",
        text: message,
    };

    await transporter.sendMail(mailOptions);
}

module.exports = sendEmail
