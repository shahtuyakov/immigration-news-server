import axios from 'axios';
import { logger } from '../utils/logger';

export class RedirectService {
  /**
   * Follows HTTP redirects to get the final destination URL
   * @param url Initial URL to follow
   * @returns The final URL after following all redirects
   */
  async getFinalUrl(url: string): Promise<string> {
    try {
      // Check if this is a Google News URL
      if (url.includes('news.google.com')) {
        // Google News URLs require special handling
        return this.handleGoogleNewsUrl(url);
      }
      
      // For non-Google URLs, follow standard redirects
      const response = await axios.get(url, {
        maxRedirects: 10,
        validateStatus: status => status < 400,
        timeout: 10000,
        // Only fetch headers, not the full response body
        headers: { 'Range': 'bytes=0-0' }
      });
      
      // Get the final URL from the response
      const finalUrl = response.request.res.responseUrl || url;
      logger.info(`Followed redirects: ${url} → ${finalUrl}`);
      return finalUrl;
    } catch (error) {
      logger.warn(`Error following redirects for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url; // Return original URL if we can't follow redirects
    }
  }

  /**
   * Handle Google News URLs specifically
   */
  private async handleGoogleNewsUrl(url: string): Promise<string> {
    try {
      // Try to extract from URL parameters first
      const parsedUrl = new URL(url);
      // Google sometimes includes the target URL in a 'url' parameter
      const urlParam = parsedUrl.searchParams.get('url');
      if (urlParam) {
        logger.info(`Extracted URL from Google News parameter: ${urlParam}`);
        return urlParam;
      }
      
      // If no URL parameter, make an actual request to follow redirects
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // Don't download the whole page, just what we need
        responseType: 'document'
      });
      
      // Try to find the canonical URL or redirect in the HTML content
      const html = response.data;
      const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
      if (canonicalMatch && canonicalMatch[1]) {
        logger.info(`Found canonical URL from Google News: ${canonicalMatch[1]}`);
        return canonicalMatch[1];
      }
      
      // Look for redirects in the page content
      const redirectMatch = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/i) || 
                           html.match(/window\.location\s*=\s*['"]([^'"]+)['"]/i);
      if (redirectMatch && redirectMatch[1]) {
        logger.info(`Found redirect in Google News page: ${redirectMatch[1]}`);
        return redirectMatch[1];
      }
      
      // If we couldn't find a redirect, return the original URL
      logger.warn(`Could not find redirect from Google News: ${url}`);
      return url;
    } catch (error) {
      logger.warn(`Error handling Google News URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url;
    }
  }
}

export default new RedirectService();