require('dotenv').config();
const express = require('express');
const app = express();
const AdmRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const cors = require("cors");
const path = require("path");
const supAdmRoutes = require('./routes/superAdminRoutes');
const cookieParser = require('cookie-parser');
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true, // reflect request origin
    credentials: true, // allow cookies/auth headers
  })
);
app.use(express.urlencoded({ extended: true }));
app.get('/login',(req, res) =>{
	res.sendFile(path.join(__dirname,"public","super-admin-login.html"));
})
app.get('/generate-admin-code',(req, res) =>{
	res.sendFile(path.join(__dirname,"public","gen-adm-code.html"));
})

app.get('/signup',(req, res) =>{
	res.sendFile(path.join(__dirname,"public","super-admin-signup.html"));
})
app.get('/add-admin',(req, res) =>{
	res.sendFile(path.join(__dirname,"public","test.html"));
})
app.get('/login-admin',(req, res) =>{
	res.sendFile(path.join(__dirname,"public","admin-login.html"));
})


app.get('/signup',(req, res) =>{
	res.sendFile(path.join(__dirname,"public","super-admin-signup.html"));
})
app.get('/test',(req, res) =>{
	res.sendFile(path.join(__dirname,"public","test.html"));
})


app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});


// Mount auth routes
app.use('/super-admin', supAdmRoutes);
app.use("/admin", AdmRoutes);
app.use("/auth",authRoutes);
app.use("/user",userRoutes);

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Sophia Assistant API running on port ${PORT}`);
});



const { close } = require('./db/db.js');

process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down...');
  await close();
  process.exit(0);
});
//Added Comments for Other Users to understand hehe :)
