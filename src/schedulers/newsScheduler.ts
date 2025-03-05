import cron from 'node-cron';
import { logger } from '../utils/logger'; // Assumed logging utility
import { parseStringPromise } from 'xml2js'; // For parsing RSS XML
import axios from 'axios';
import redirectService from '../services/RedirectService'; // Redirect service singleton
import config from '../config'; // Assumed configuration file

export class NewsScheduler {
  private schedule: string;
  private rssUrl: string;

  constructor() {
    // Default schedule: every 30 minutes
    this.schedule = config.RSS_CRON_SCHEDULE || '0,30 * * * *';
    // Sample Google News RSS feed for US immigration news
    this.rssUrl = 'https://news.google.com/rss/search?q=us+immigration+policy+OR+immigration+law+OR+USCIS+OR+visa&hl=en-US&gl=US&ceid=US:en';
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
      const response = await axios.get(this.rssUrl);
      const rssResponse = response.data;

      // Parse RSS XML to JSON
      const result = await parseStringPromise(rssResponse, { explicitArray: false });
      const items = result.rss.channel.item;

      // Ensure items is an array
      const newsItems = Array.isArray(items) ? items : [items];

      // For testing purposes, process only the first item
      if (newsItems.length > 0) {
        const item = newsItems[0]; // Select the first item
        logger.info(`Processing test item: "${item.title}" from "${item.source._}"`);

        const googleNewsUrl = item.link; // Google News redirect URL
        const sourceUrl = item.source["$"].url; // e.g., "https://news.berkeley.edu"

        if (!sourceUrl) {
          logger.warn(`No source URL found for item: ${item.title}`);
          return;
        }

        // Resolve the final article URL
        const finalUrl = await redirectService.getFinalUrl(googleNewsUrl, sourceUrl);
        logger.info(`Resolved URL: ${googleNewsUrl} → ${finalUrl}`);

        // Placeholder for further processing (e.g., scraping and saving)
        // TODO: await scrapeAndSave(finalUrl, item);
      } else {
        logger.info('No items found in the RSS feed.');
      }

      logger.info('Completed news feed processing');
    } catch (error) {
      logger.error('Error in news feed processing:', error);
      throw error;
    }
  }
}

export default new NewsScheduler();