import axios from 'axios';
import Parser from 'rss-parser';
import { logger } from '../utils/logger';

interface GoogleNewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  guid: string;
  categories?: string[];
}

export class RssService {
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          'source',
          'categories',
        ],
      },
    });
  }

  async fetchImmigrationNews(): Promise<GoogleNewsItem[]> {
    try {
      // US Immigration news feed URL
      const feedUrl = 'https://news.google.com/rss/search?q=us+immigration&hl=en-US&gl=US&ceid=US:en';
      
      const feed = await this.parser.parseURL(feedUrl);
      
      logger.info(`Fetched ${feed.items.length} items from RSS feed`);
      
      // Sort items by date (newest first) and take only the most recent 2
      const sortedItems = (feed.items as GoogleNewsItem[]).sort((a, b) => {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });
      
      // Limit to first 2 most recent items
      const limitedItems = sortedItems.slice(0, 2);
      logger.info(`Processing only the 2 most recent news items from RSS feed`);
      
      // Log the items being processed
      limitedItems.forEach((item, index) => {
        logger.info(`Item ${index + 1}: "${item.title}" - Published: ${item.pubDate}`);
      });
      
      return limitedItems;
    } catch (error) {
      logger.error('Error fetching RSS feed:', error);
      throw new Error(`RSS feed fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  extractSourceUrl(googleNewsUrl: string): string {
    try {
      // Google News URLs typically redirect to source - extract the real URL
      const url = new URL(googleNewsUrl);
      const sourceUrl = url.searchParams.get('url');
      return sourceUrl || googleNewsUrl;
    } catch (error) {
      logger.warn(`Could not extract source URL from ${googleNewsUrl}`);
      return googleNewsUrl;
    }
  }
}

export default new RssService();