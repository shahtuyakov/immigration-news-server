import express from 'express';
import { connectDatabase } from './config/database'; // Assumed database connection utility
import { logger } from './utils/logger'; // Assumed logging utility
import config from './config'; // Assumed configuration file
import newsRoutes from './routes/newsRoutes'; // Assumed routes for news API
import newsScheduler from './schedulers/newsScheduler'; // News scheduler singleton

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
    // Connect to the database (e.g., MongoDB)
    await connectDatabase();
    logger.info('Database connected successfully.');

    // Start the news scheduler
    newsScheduler.start();
    logger.info('News scheduler started.');

    // Start Express server
    const PORT = config.PORT || 3030; // Default to 3030 if not set in config
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
    });

    // Handle server startup errors
    server.on('error', (err) => {
      logger.error('Server failed to start:', err);
      process.exit(1);
    });

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully.');
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
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