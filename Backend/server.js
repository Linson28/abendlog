const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// require('jsonwebtoken'); 

// const authRoutes = require('./routes/authRoutes');

const abendRoutes = require('./routes/abendRoutes');
const { connectDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;


// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// //CORS configuration
// const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];
// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true
// }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

//to server static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Routes
// app.use('/api/auth', authRoutes);
app.use('/api/abend', abendRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Abend Log Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for React app - MUST come AFTER all API routes
app.get('/*path', (req, res) => {
  // Skip API routes (redundant check since API routes are handled above)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'API route not found'
    });
  }
  
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// // 404 handler - FIXED: Remove the '*' pattern
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   });
// });

// Start server
async function startServer() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Server live at: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();