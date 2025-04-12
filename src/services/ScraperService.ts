import axios from 'axios';
import { logger } from '../utils/logger';
import config from '../config';

interface ScraperResult {
  content: string;
  title: string;
  siteName: string;
  author?: string;
  publishedAt?: string;
  metadata?: any;
}

export class ScraperService {
  private apiKey: string;
  private apiUrl: string;
  
  constructor() {
    this.apiKey = config.SPIDER_CLOUD_API_KEY || '';
    this.apiUrl = 'https://api.spider.cloud/crawl';
    
    if (!this.apiKey) {
      logger.error('Spider API key not configured');
      throw new Error('Spider API key not configured');
    }
  }

  async scrapeArticle(url: string): Promise<ScraperResult> {
    try {
      logger.info(`Starting to scrape article from: ${url}`);
      
      const requestData = {
        url: url,
        limit: 1,
        return_format: 'markdown',
        readability: true,
        metadata: true
      };
      
      const response = await axios.post<ScraperResult>(
        this.apiUrl,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const content = response.data.content || 
                    (Array.isArray(response.data) && response.data[0]?.content);
      
      if (!content || content === '</body>') {
        throw new Error(`No valid content returned from Spider API for URL: ${url}`);
      }
      
      // Extract domain from URL
      const domain = new URL(url).hostname;
      
      logger.info(`Successfully scraped article from ${domain}. Content length: ${content.length} chars`);
      
      return {
        content: content,
        title: response.data.title,
        siteName: domain,
        author: 'Unknown Author',
        publishedAt: new Date().toISOString(),
        metadata: response.data.metadata
      };
    } catch (error) {
      logger.error(`Error scraping article from ${url}:`, error);
      throw new Error(`Content scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new ScraperService();