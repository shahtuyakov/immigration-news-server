import cron from 'node-cron';
import { logger } from '../utils/logger';
import rssService from '../services/RssService';
import scraperService from '../services/ScraperService';
import summarizerService from '../services/SummarizerService';
import databaseService from '../services/DatabaseService';
import redirectService from '../services/RedirectService';
import config from '../config';
import mongoose from 'mongoose';

export class NewsScheduler {
  private schedule: string;
  
  constructor() {
    // Default to running twice per hour (at 0 and 30 minutes)
    this.schedule = config.RSS_CRON_SCHEDULE || '0,30 * * * *';
  }
  
  start(): void {
    logger.info(`Starting news scheduler with schedule: ${this.schedule}`);
    
    cron.schedule(this.schedule, async () => {
      try {
        await this.processNewsFeed();
      } catch (error) {
        logger.error('Error in scheduled news processing:', error);
      }
    });
    
    // Run immediately on startup
    this.processNewsFeed().catch(error => {
      logger.error('Error in initial news processing:', error);
    });
  }
  
  async processNewsFeed(): Promise<void> {
    logger.info('Starting news feed processing');
    
    try {
      // Fetch RSS feed
      const newsItems = await rssService.fetchImmigrationNews();
      logger.info(`Retrieved ${newsItems.length} news items from RSS`);
      
      // First, extract URLs that need processing
      for (const item of newsItems) {
        // Log the original Google News URL for debugging
        logger.info(`Processing RSS item: ${item.title}`);
        logger.info(`Original URL: ${item.link}`);
        
        try {
          // Get the final URL after redirects
          const finalUrl = await redirectService.getFinalUrl(item.link);
          logger.info(`Final URL: ${finalUrl}`);
          
          // Check if URL has been processed already
          const isProcessed = await databaseService.isUrlProcessed(finalUrl);
          
          if (isProcessed) {
            logger.info(`Skipping already processed URL: ${finalUrl}`);
            continue;
          }
          
          // Scrape the article content
          logger.info(`Scraping content from: ${finalUrl}`);
          const scrapedContent = await scraperService.scrapeArticle(finalUrl);
          
          // Extract domain from URL as source
          const source = new URL(finalUrl).hostname;
          
          // Summarize the content
          const summary = await summarizerService.summarizeContent(
            scrapedContent.content,
            scrapedContent.title
          );
          
          // Prepare the news object
          const newsData = {
            headline: scrapedContent.title || item.title,
            content: scrapedContent.content,
            contentSummary: summary,
            imageUrl: scrapedContent.imageUrl,
            source: scrapedContent.siteName || source,
            author: scrapedContent.author || 'Unknown Author',
            publishedAt: new Date(scrapedContent.publishedAt || item.pubDate || new Date()),
            updatedAt: new Date(),
            region: 'US',
            categories: item.categories || ['Immigration'],
            tags: ['immigration', 'news'],
            contentLength: scrapedContent.content.length,
            timezone: 'America/New_York'
          };
          
          // Save to database
          const savedNews = await databaseService.saveNews(newsData);
          
          // Mark URL as processed
          await databaseService.markUrlAsProcessed(finalUrl, true, savedNews._id as mongoose.Types.ObjectId);
          
          logger.info(`Successfully processed article: ${newsData.headline}`);
        } catch (error) {
          logger.error(`Error processing item "${item.title}":`, error);
          // Mark original URL as processed but failed
          await databaseService.markUrlAsProcessed(item.link, false);
          continue;
        }
      }
      
      logger.info('Completed news feed processing');
    } catch (error) {
      logger.error('Error in news feed processing:', error);
      throw error;
    }
  }
  
  updateSchedule(newSchedule: string): void {
    this.schedule = newSchedule;
    logger.info(`Updated news scheduler to run with schedule: ${this.schedule}`);
  }
}

export default new NewsScheduler();