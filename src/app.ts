import express from 'express';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import config from './config';
import newsRoutes from './routes/newsRoutes';
import newsScheduler from './schedulers/newsScheduler';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/news', newsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Start the scheduler
    newsScheduler.start();
    
    // Start Express server
    const PORT = config.PORT;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Start the application
startServer();

export default app;