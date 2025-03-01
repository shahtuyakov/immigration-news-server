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
        if (existingNews.content !== newsData.content) {
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

    // Add these methods to the DatabaseService class
    async markUrlAsProcessed(url: string, successful: boolean, articleId?: mongoose.Types.ObjectId): Promise<IProcessedURL> {
        try {
            const processedUrl = new ProcessedURL({
            url,
            processedAt: new Date(),
            successful,
            articleId
            });
            
            await processedUrl.save();
            return processedUrl;
        } catch (error) {
            // Handle duplicate key errors gracefully (URL already processed)
            if (error instanceof mongoose.Error && 'code' in error && error.code === 11000) {
                logger.info(`URL ${url} already marked as processed`);
                const existingUrl = await ProcessedURL.findOne({ url });
                if (!existingUrl) {
                    throw new Error('Failed to find existing processed URL record');
                }
                return existingUrl;
            }
            throw error;
        }
    }

    async isUrlProcessed(url: string): Promise<boolean> {
        const processedUrl = await ProcessedURL.findOne({ url });
        return !!processedUrl;
    }

    async getUnprocessedUrls(urls: string[]): Promise<string[]> {
        // Find all processed URLs from the list
        const processedUrls = await ProcessedURL.find({
        url: { $in: urls }
    }).select('url');
    
    // Create a set of processed URLs for easy lookup
    const processedUrlSet = new Set(processedUrls.map(p => p.url));
    
    // Return only URLs that haven't been processed
    return urls.filter(url => !processedUrlSet.has(url));
    }

}

export default new DatabaseService();