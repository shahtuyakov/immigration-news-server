import News, { INews } from '../models/News';
import { logger } from '../utils/logger';
import ProcessedURL, { IProcessedURL } from '../models/ProcessedURL';
import mongoose from 'mongoose';

export class DatabaseService {
  async saveNews(newsData: Partial<INews>): Promise<INews> {
    try {
      // Check if the article already exists by headline and source
      const existingNews = await News.findOne({
        headline: newsData.headline,
        source: newsData.source
      });
      
      if (existingNews) {
        // Update existing record if needed
        if (existingNews.contentSummary !== newsData.contentSummary) {
          Object.assign(existingNews, newsData, {
            updatedAt: new Date()
          });
          await existingNews.save();
          logger.info(`Updated news article: ${newsData.headline}`);
          return existingNews;
        }
        logger.info(`News article already exists: ${newsData.headline}`);
        return existingNews;
      }
      
      // Create a new record
      const news = new News({
        ...newsData,
        updatedAt: new Date()
      });
      
      await news.save();
      logger.info(`Saved new news article: ${newsData.headline}`);
      return news;
    } catch (error) {
      logger.error('Error saving news to database:', error);
      throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getRecentNews(limit: number = 20): Promise<INews[]> {
    try {
      return await News.find()
        .sort({ publishedAt: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error fetching recent news from database:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getNewsByCategory(category: string, limit: number = 20): Promise<INews[]> {
    try {
      return await News.find({ categories: category })
        .sort({ publishedAt: -1 })
        .limit(limit);
    } catch (error) {
      logger.error(`Error fetching news by category ${category}:`, error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark a URL as processed, with improved error handling for duplicate keys
   */
  async markUrlAsProcessed(url: string, successful: boolean, articleId?: mongoose.Types.ObjectId): Promise<IProcessedURL> {
    try {
      // First check if the URL already exists
      const existingUrl = await ProcessedURL.findOne({ url });
      
      if (existingUrl) {
        // Just update the existing record if needed
        if (existingUrl.successful !== successful || 
            (articleId && !existingUrl.articleId?.equals(articleId))) {
          
          existingUrl.successful = successful;
          if (articleId) {
            existingUrl.articleId = articleId;
          }
          existingUrl.processedAt = new Date();
          
          await existingUrl.save();
          logger.info(`Updated processed URL status: ${url}`);
        } else {
          logger.info(`URL already marked as processed with same status: ${url}`);
        }
        
        return existingUrl;
      }
      
      // Create a new record - use findOneAndUpdate with upsert to avoid race conditions
      const processedUrl = await ProcessedURL.findOneAndUpdate(
        { url }, 
        {
          url,
          processedAt: new Date(),
          successful,
          articleId
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );
      
      if (!processedUrl) {
        throw new Error(`Failed to create processed URL record for ${url}`);
      }
      
      logger.info(`Marked URL as processed: ${url}`);
      return processedUrl;
    } catch (error) {
      // Special handling for duplicate key errors
      if (error instanceof mongoose.Error.VersionError || 
          (error instanceof mongoose.Error && 'code' in error && error.code === 11000)) {
        
        logger.info(`URL ${url} already marked as processed (concurrent operation)`);
        const existingUrl = await ProcessedURL.findOne({ url });
        if (!existingUrl) {
          throw new Error('Failed to find existing processed URL record');
        }
        return existingUrl;
      }
      
      logger.error(`Error marking URL as processed: ${url}`, error);
      throw error;
    }
  }

  async isUrlProcessed(url: string): Promise<boolean> {
    try {
      const processedUrl = await ProcessedURL.findOne({ url });
      return !!processedUrl;
    } catch (error) {
      logger.error(`Error checking if URL is processed: ${url}`, error);
      // Default to false on error - will attempt to process the URL
      return false;
    }
  }

  async getUnprocessedUrls(urls: string[]): Promise<string[]> {
    try {
      if (!urls.length) {
        return [];
      }
      
      // Find all processed URLs from the list
      const processedUrls = await ProcessedURL.find({
        url: { $in: urls }
      }).select('url');
      
      // Create a set of processed URLs for easy lookup
      const processedUrlSet = new Set(processedUrls.map(p => p.url));
      
      // Return only URLs that haven't been processed
      return urls.filter(url => !processedUrlSet.has(url));
    } catch (error) {
      logger.error('Error getting unprocessed URLs:', error);
      // Return empty array on error
      return [];
    }
  }
}

export default new DatabaseService();