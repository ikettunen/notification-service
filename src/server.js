const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const expressPino = require('express-pino-logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const connectDB = require('./config/database');
require('dotenv').config();

// Import routes
const notificationRoutes = require('./routes/notificationRoutes');

// Initialize logger
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const expressLogger = expressPino({ logger });

// Connect to MongoDB
connectDB();

// Initialize express app
const app = express();

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    const elasticIp = process.env.AWS_ELASTIC_IP;
    const allowedOrigins = [
      // AWS Elastic IP URLs
      process.env.FRONTEND_URL,
      process.env.DASHBOARD_URL,
      process.env.API_GATEWAY_URL,
      elasticIp ? `http://${elasticIp}:3000` : null,
      elasticIp ? `http://${elasticIp}:3001` : null,
      elasticIp ? `http://${elasticIp}:3002` : null,
      elasticIp ? `http://${elasticIp}:3003` : null,
      elasticIp ? `http://${elasticIp}:3004` : null,
      elasticIp ? `http://${elasticIp}:3005` : null,
      elasticIp ? `http://${elasticIp}:3006` : null,
      elasticIp ? `http://${elasticIp}:3007` : null,
      elasticIp ? `http://${elasticIp}:3008` : null,
      elasticIp ? `http://${elasticIp}:3009` : null,
      // Local development URLs
      process.env.LOCAL_FRONTEND_URL,
      process.env.LOCAL_DASHBOARD_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'http://localhost:3006',
      'http://localhost:3007',
      'http://localhost:3008',
      'http://localhost:3009',
      'http://localhost:4000',
      'http://localhost:5000'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn({ origin, allowedOrigins }, 'CORS origin not allowed');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressLogger);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Notification Service API Documentation'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/notifications', notificationRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3009;
  app.listen(port, () => {
    logger.info(`Notification service listening at http://localhost:${port}`);
    logger.info(`API documentation available at http://localhost:${port}/api-docs`);
  });
}

module.exports = app;
