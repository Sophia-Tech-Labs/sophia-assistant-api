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

const allowedOrigins = [
  "http://localhost:3000", // for local testing
  "https://sophia-assistant-frontend.vercel.app" // 🔥 your Vercel frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true
}));
app.options("*", cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

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
