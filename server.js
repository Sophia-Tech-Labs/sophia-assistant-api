require('dotenv').config();
const express = require('express');
const app = express();
const adminController = require('./controllers/adminController');
const supAdmRoutes = require('./routes/superAdminRoutes');
const AdmRoutes = require("./routes/authRoutes");
const cors = require("cors");
const path = require("path");
app.use(
  cors({
    origin: true, // reflect request origin
    credentials: true, // allow cookies/auth headers
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});


// Mount auth routes
app.use('/super-admin', supAdmRoutes);
app.use("/admin", AdmRoutes);

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
