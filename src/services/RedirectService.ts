import axios from 'axios';
import { logger } from '../utils/logger'; // Assumed logging utility

export class RedirectService {
  /**
   * Resolves the final article URL from a given URL, optionally using a source URL.
   * @param url The initial URL (e.g., Google News link)
   * @param sourceUrl Optional publisher base URL (e.g., "https://news.berkeley.edu")
   * @returns The resolved article URL
   */
  async getFinalUrl(url: string, sourceUrl: string | null = null): Promise<string> {
    try {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

      // For non-Google URLs, follow redirects
      const response = await axios.head(url, {
        maxRedirects: 20,
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: { 'User-Agent': userAgent },
      });

      console.log(`Response: ${response.status}`);

      const finalUrl = response.request.res.responseUrl || url;
      logger.info(`Followed redirects: ${url} → ${finalUrl}`);
      return finalUrl;
    } catch (error) {
      logger.warn(`Error resolving URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url; // Fallback to original URL on error
    }
  }
}

export default new RedirectService();