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
      
      // Extract source URLs
      const initialUrls = newsItems.map(item => item.link);

      // Process URLs in batches to avoid too many concurrent requests
      const finalUrls = [];
      const batchSize = 5;
      
      for (let i = 0; i < initialUrls.length; i += batchSize) {
        const batch = initialUrls.slice(i, i + batchSize);
        const redirectBatch = await Promise.all(
          batch.map(url => redirectService.getFinalUrl(url))
        );
        finalUrls.push(...redirectBatch);
        
        // Small delay to be nice to servers
        if (i + batchSize < initialUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Create a mapping between original URLs and their redirected versions
      const urlMap = new Map();
      for (let i = 0; i < initialUrls.length; i++) {
        if (i < finalUrls.length) {
          urlMap.set(initialUrls[i], finalUrls[i]);
        }
      }
      
      // Create news item lookup using the correct redirected URLs
      const newsItemsByUrl = new Map();
      newsItems.forEach(item => {
        const originalUrl = item.link;
        const finalUrl = urlMap.get(originalUrl);
        if (finalUrl) {
          newsItemsByUrl.set(finalUrl, item);
        }
      });
      
      // Filter out already processed URLs
      const unprocessedUrls = await databaseService.getUnprocessedUrls(finalUrls);
      logger.info(`Found ${unprocessedUrls.length} unprocessed URLs out of ${finalUrls.length} total`);
      
      // Process each unprocessed URL
      for (const url of unprocessedUrls) {
        try {
          // Get the original news item
          const item = newsItemsByUrl.get(url);
          if (!item) {
            logger.warn(`No news item found for URL: ${url}`);
            continue;
          }
          
          // Scrape the article content
          const scrapedContent = await scraperService.scrapeArticle(url);
          
          // Extract domain from URL as source
          const source = new URL(url).hostname;
          
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
          await databaseService.markUrlAsProcessed(url, true, savedNews._id as mongoose.Types.ObjectId);
          
        } catch (error) {
          logger.error(`Error processing URL ${url}:`, error);
          // Mark as processed but failed
          await databaseService.markUrlAsProcessed(url, false);
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