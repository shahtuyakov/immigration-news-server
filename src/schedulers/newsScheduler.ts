import cron from 'node-cron';
import { logger } from '../utils/logger';
import config from '../config';
import rssService from '../services/RssService';
import redirectService from '../services/RedirectService';
import scraperService from '../services/ScraperService';
import { SummarizerService } from '../services/SummarizerService';
import databaseService from '../services/DatabaseService';
import { ObjectId } from 'bson';
import { chromium } from 'playwright';

export class NewsScheduler {
  private schedule: string;
  private browser: any;
  private context: any;

  constructor() {
    // Default schedule: every 30 minutes
    this.schedule = config.RSS_CRON_SCHEDULE || '0,30 * * * *';
  }

  async initBrowser() {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext();
  }

  async closeBrowser() {
    await this.context.close();
    await this.browser.close();
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
    await this.initBrowser();
    try {
      // Get RSS feed items
      const newsItems = await rssService.fetchImmigrationNews();
      logger.info(`Retrieved ${newsItems.length} items from RSS feed`);

      // Process each news item
      for (const item of newsItems) {
        await this.processSingleNewsItem(item);
      }
      logger.info('Completed news feed processing');
    } catch (error) {
      logger.error('Error in news feed processing:', error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  private async processSingleNewsItem(item: any): Promise<void> {
    const googleNewsUrl = item.link;

    try {
      // Check if URL has been processed already
      const isProcessed = await databaseService.isUrlProcessed(googleNewsUrl);
      if (isProcessed) {
        logger.info(`URL already processed: ${googleNewsUrl}`);
        return;
      }

      // Resolve the final article URL
      const finalUrl = await redirectService.getFinalUrl(googleNewsUrl);
      logger.info(`Resolved URL: ${googleNewsUrl} -> ${finalUrl}`);

      // Ensure you never scrape Google News URLs
      if (finalUrl.includes('news.google.com')) {
        logger.warn(`Redirect failed, skipping URL: ${item.link}`);
        await databaseService.markUrlAsProcessed(item.link, false);
        return;
      }

      // Scrape the article content
      const scrapedContent = await scraperService.scrapeArticle(finalUrl);

      // Summarize the content
      const summary = await new SummarizerService().summarizeContent(
        scrapedContent.content,
        scrapedContent.title
      );

      // Prepare the news object to save in database
      const newsData = {
        headline: scrapedContent.title,
        content: scrapedContent.content,
        contentSummary: summary,
        imageUrl: scrapedContent.imageUrl,
        source: scrapedContent.siteName || item.source,
        author: scrapedContent.author || 'Unknown',
        publishedAt: scrapedContent.publishedAt ? new Date(scrapedContent.publishedAt) : new Date(item.pubDate),
        updatedAt: new Date(),
        region: 'US', // Default region
        categories: item.categories || ['Immigration'],
        tags: ['immigration'], // Default tag
        contentLength: scrapedContent.content.length,
        timezone: 'UTC' // Default timezone
      };

      // Save to database
      const savedNews = await databaseService.saveNews(newsData);
      if (!savedNews?._id) throw new Error('Failed to save news - no ID returned');

      // Mark URL as processed
      await databaseService.markUrlAsProcessed(
        googleNewsUrl,
        true,
        new ObjectId(savedNews._id.toString())
      );

      logger.info(`Successfully processed and saved article: ${newsData.headline}`);
    } catch (error) {
      logger.error(`Error processing item ${googleNewsUrl}:`, error);
      // Mark URL as processed but with error
      await databaseService.markUrlAsProcessed(googleNewsUrl, false);
    }
  }
}

export default new NewsScheduler();