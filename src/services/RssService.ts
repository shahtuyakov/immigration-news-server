import Parser from 'rss-parser';
import { logger } from '../utils/logger';

interface GoogleNewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  guid: string;
  categories?: string[];
  contentSnippet?: string;
}

export class RssService {
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          'source',
          'categories',
          'contentSnippet'
        ],
      },
    });
  }

  async fetchImmigrationNews(): Promise<GoogleNewsItem[]> {
    try {
      // US Immigration news feed URL - improve search query for better results
      const feedUrl = 'https://news.google.com/rss/search?q=us+immigration+policy+OR+immigration+law+OR+USCIS+OR+visa&hl=en-US&gl=US&ceid=US:en';
      
      logger.info(`Fetching RSS feed from: ${feedUrl}`);
      const feed = await this.parser.parseURL(feedUrl);
      
      logger.info(`Fetched ${feed.items.length} items from RSS feed`);
      
      // Extract relevant fields from each item
      const newsItems = feed.items.map(item => {
        return {
          title: item.title || 'No Title',
          link: item.link || '',
          pubDate: item.pubDate || new Date().toISOString(),
          source: this.extractSourceFromTitle(item.title || ''),
          guid: item.guid || item.link || '',
          categories: (item.categories || ['Immigration']),
          contentSnippet: item.contentSnippet || ''
        } as GoogleNewsItem;
      });
      
      // Sort items by date (newest first)
      const sortedItems = newsItems.sort((a, b) => {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });
      
      // Limit to first 5 most recent items for processing
      const limitedItems = sortedItems.slice(0, 1);
      logger.info(`Processing the ${limitedItems.length} most recent news items from RSS feed`);
      
      // Log the items being processed
      limitedItems.forEach((item, index) => {
        logger.info(`Item ${index + 1}: "${item.title}" from "${item.source}" - Published: ${item.pubDate}`);
      });
      
      return limitedItems;
    } catch (error) {
      logger.error('Error fetching RSS feed:', error);
      throw new Error(`RSS feed fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract source publication from Google News title format "Title - Source"
  private extractSourceFromTitle(title: string): string {
    const match = title.match(/\s+-\s+([^-]+)$/);
    return match ? match[1].trim() : 'Unknown Source';
  }

  // This method can be used to extract URLs directly from Google News links
  // though we're now using RedirectService for this purpose
  extractSourceUrl(googleNewsUrl: string): string {
    try {
      // Google News URLs typically redirect to source - extract the real URL
      const url = new URL(googleNewsUrl);
      const sourceUrl = url.searchParams.get('url');
      return sourceUrl || googleNewsUrl;
    } catch (error) {
      logger.warn(`Could not extract source URL from ${googleNewsUrl}`, error);
      return googleNewsUrl;
    }
  }
}

export default new RssService();