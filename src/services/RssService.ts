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
      
      return feed.items as GoogleNewsItem[];
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