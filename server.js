require('dotenv').config();
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('NODE_ENV:', process.env.NODE_ENV);
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const taskRoutes = require('./routes/taskRoutes');

// const requiredVars = [
//   'JWT_SECRET',
//   'JWT_EXPIRES_IN',
//   'MONGO_URI',
//   'REFRESH_TOKEN_SECRET',
//   'REFRESH_TOKEN_EXPIRES_IN',
//   'CLIENT_URL'
// ];

// requiredVars.forEach((key) => {
//   if (!process.env[key]) {
//     console.error(`Error: Missing required environment variable ${key}`);
//     process.exit(1);
//   }
// });

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));

// Logging — before everything so all requests are logged
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// Body parser
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 7,
  message: { message: "Too many attempts. Please try again after 15 minutes." }
});

// Routes
app.use('/api/auth', authLimiter);
app.use('/api/auth', authRoutes);
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api', teamRoutes);
app.use('/api', taskRoutes);

// Error handler — always last
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server');
    process.exit(1);
  }
}

startServer();