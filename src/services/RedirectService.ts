import axios from 'axios';
import { logger } from '../utils/logger';

export class RedirectService {
  /**
   * Follows URL redirects and returns the final destination URL
   * This is particularly useful for Google News URLs which redirect to the original source
   */
  async followRedirect(url: string): Promise<string> {
    try {
      logger.info(`Following redirects for URL: ${url}`);
      
      // Make a HEAD request to follow redirects without downloading content
      const response = await axios.head(url, {
        maxRedirects: 10, // Allow up to 10 redirects
        validateStatus: null, // Don't throw error on any status code
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Get the final URL after all redirects
      const finalUrl = response.request.res.responseUrl || url;
      
      if (finalUrl !== url) {
        logger.info(`URL redirect: ${url} -> ${finalUrl}`);
      } else {
        logger.info(`No redirect occurred for URL: ${url}`);
      }
      
      return finalUrl;
    } catch (error) {
      logger.error(`Error following redirect for ${url}:`, error);
      // If there's an error, return the original URL
      return url;
    }
  }
}

export default new RedirectService();