import puppeteer from 'puppeteer';
import { logger } from '../utils/logger';

export class RedirectService {
  async getFinalUrl(url: string, sourceUrl: string | null = null): Promise<string> {
    // Handle Google redirect URLs directly without browser if possible
    if (url.startsWith('https://www.google.com/url?') || url.startsWith('https://news.google.com/rss/articles/')) {
      try {
        const urlObj = new URL(url);
        const directUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
        if (directUrl) {
          logger.info(`Extracted direct URL from Google redirect: ${url} → ${directUrl}`);
          return directUrl;
        }
      } catch (error) {
        logger.warn(`Failed to parse Google redirect URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // If direct extraction fails, use Puppeteer to follow all redirects
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    try {
      await page.setDefaultNavigationTimeout(30000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Wait for navigation to complete
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Some sites use client-side redirects, wait a bit longer
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalUrl = page.url();
      logger.info(`Followed redirects: ${url} → ${finalUrl}`);
      return finalUrl;
    } catch (error) {
      logger.warn(`Error resolving URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url; // Fallback to original URL on error
    } finally {
      await browser.close();
    }
  }
}

export default new RedirectService();