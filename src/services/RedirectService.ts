import axios from 'axios';
import { JSDOM } from 'jsdom'; // For HTML parsing
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
      if (url.includes('news.google.com')) {
        return await this.resolveGoogleNewsUrl(url, sourceUrl);
      }

      // For non-Google URLs, follow redirects
      const response = await axios.head(url, {
        maxRedirects: 10,
        timeout: 10000,
        validateStatus: (status) => status < 400,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      const finalUrl = response.request.res.responseUrl || url;
      logger.info(`Followed redirects: ${url} → ${finalUrl}`);
      return finalUrl;
    } catch (error) {
      logger.warn(`Error resolving URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url; // Fallback to original URL on error
    }
  }

  /**
   * Resolves a Google News URL to the actual article URL using the source URL.
   * @param googleNewsUrl The Google News URL from the RSS feed
   * @param sourceUrl The publisher's base URL from <source>
   * @returns The final article URL
   */
  private async resolveGoogleNewsUrl(googleNewsUrl: string, sourceUrl: string | null): Promise<string> {
    try {
      logger.info(`Resolving Google News URL: ${googleNewsUrl} with source URL: ${sourceUrl}`);

      // Fetch the Google News page
      const response = await axios.get(googleNewsUrl, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      // Parse HTML
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      if (sourceUrl) {
        // Find links matching the source URL
        const matchingLinks = document.querySelectorAll(`a[href^="${sourceUrl}"], a[href*="${sourceUrl}"]`);
        if (matchingLinks.length > 0) {
          const href = matchingLinks[0].getAttribute('href');
          if (href) {
            const resolvedUrl = new URL(href, googleNewsUrl).toString();
            logger.info(`Found article URL matching source: ${resolvedUrl}`);
            return resolvedUrl;
          }
        }
      }

      // Fallback: Find the first external link not on google.com
      const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="google.com"])');
      if (externalLinks.length > 0) {
        const href = externalLinks[0].getAttribute('href');
        if (href) {
          const resolvedUrl = new URL(href, googleNewsUrl).toString();
          logger.info(`Found external article URL: ${resolvedUrl}`);
          return resolvedUrl;
        }
      }

      logger.warn(`Could not extract article URL from ${googleNewsUrl} with source ${sourceUrl}`);
      return googleNewsUrl; // Fallback to original URL
    } catch (error) {
      logger.warn(`Error resolving Google News URL ${googleNewsUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return googleNewsUrl; // Fallback to original URL on error
    }
  }
}

export default new RedirectService();