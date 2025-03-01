// src/services/ScraperService.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import config from '../config';

interface SpiderResponse {
  content: string;
  metadata: {
    title: string;
    description: string;
  };
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
  
  async scrapeArticle(url: string) {
    try {
      const response = await axios.post<SpiderResponse>(
        this.apiUrl,
        {
          url: url,
          limit: 1,
          return_format: 'markdown',
          readability: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.content) {
        throw new Error('No content returned from Spider API');
      }
      
      // Extract domain from URL
      const domain = new URL(url).hostname;
      
      return {
        content: response.data.content,
        title: response.data.metadata?.title || '',
        description: response.data.metadata?.description || '',
        siteName: domain
      };
    } catch (error) {
      logger.error(`Error scraping article from ${url}:`, error);
      throw new Error(`Content scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new ScraperService();