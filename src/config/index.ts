import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default {
  PORT: process.env.PORT || 3030,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/immigration-news',
  SPIDER_CLOUD_API_KEY: process.env.SPIDER_CLOUD_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  RSS_CRON_SCHEDULE: process.env.RSS_CRON_SCHEDULE || '*/30 * * * *',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};