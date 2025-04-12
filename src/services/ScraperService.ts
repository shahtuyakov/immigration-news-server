import axios from 'axios';
import { logger } from '../utils/logger';
import config from '../config';
import fs from 'fs';

interface ScraperResult {
  content: string;
  title: string;
  siteName: string;
  author?: string;
  publishedAt?: string;
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
      
      console.log(`Attempting to scrape: ${url}`);
      
      const requestData = {
        url: url,
        limit: 1,
        return_format: 'markdown',
        readability: true
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
      
      // Log the raw response from Spider crawler
      console.log('Spider crawler raw response:');
      console.log(JSON.stringify(response.data, null, 2));

      fs.writeFile('result.json', JSON.stringify(response.data, null, 2), (err) => {
        if (err) {
          console.error('Error saving file:', err);
        } else {
          console.log('Result saved to result.json');
        }
      });
      
      const content = response.data.content || 
                    (Array.isArray(response.data) && response.data[0]?.content);
      
      if (!content || content === '</body>') {
        throw new Error(`No valid content returned from Spider API for URL: ${url}`);
      }
      
      // Extract domain from URL
      const domain = new URL(url).hostname;
      
      // Log content length and metadata
      console.log(`Spider crawler content length: ${content.length} characters`);
      console.log(`Spider crawler metadata:`, response.data || 'No metadata available');
      
      logger.info(`Successfully scraped article from ${domain}. Content length: ${content.length} chars`);
      
      // Extract a basic date from the content or URL as fallback for publishedAt
      const dateMatch = content.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/);
      const extractedDate = dateMatch ? dateMatch[0] : null;
      
      // Extract any potential author information from content
      const authorMatch = content.match(/[Bb]y\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
      const extractedAuthor = authorMatch ? authorMatch[1] : null;
      
      return {
        content: content,
        title: response.data.title,
        siteName: domain,
        author: extractedAuthor || 'Unknown Author',
        publishedAt: extractedDate || new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error scraping article from ${url}:`, error);
      throw new Error(`Content scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new ScraperService();