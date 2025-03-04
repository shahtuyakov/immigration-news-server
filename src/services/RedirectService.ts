import axios from 'axios';
import { logger } from '../utils/logger';
import { JSDOM } from 'jsdom';

export class RedirectService {
  async getFinalUrl(url: string): Promise<string> {
    try {
      // Check if it's a Google News URL
      if (url.includes('news.google.com')) {
        return this.resolveGoogleNewsUrl(url);
      }

      // For regular URLs, use HEAD request to follow redirects
      const response = await axios.head(url, {
        maxRedirects: 10,
        timeout: 10000,
        validateStatus: (status) => status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const finalUrl = response.request.res.responseUrl || url;
      logger.info(`Followed redirects: ${url} → ${finalUrl}`);
      return finalUrl;
    } catch (error) {
      logger.warn(`Error following redirects for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url;
    }
  }

  /**
   * Specialized method to resolve Google News URLs to their source articles
   */
  private async resolveGoogleNewsUrl(url: string): Promise<string> {
    try {
      logger.info(`Resolving Google News URL: ${url}`);
      
      // Try to extract URL from query parameter first
      const urlObj = new URL(url);
      const urlParam = urlObj.searchParams.get('url');
      if (urlParam) {
        const decodedUrl = decodeURIComponent(urlParam);
        logger.info(`Extracted URL from Google News parameter: ${decodedUrl}`);
        return decodedUrl;
      }

      // Make a full GET request to the Google News article page
      const response = await axios.get(url, {
        maxRedirects: 0, // Don't follow automatic redirects
        validateStatus: () => true, // Accept any status code
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Check for redirect headers
      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        const redirectUrl = new URL(response.headers.location, url).toString();
        logger.info(`Found redirect header to: ${redirectUrl}`);
        return redirectUrl;
      }

      // Parse HTML to find the actual article URL
      const html = response.data.toString();
      
      // Use JSDOM to parse the HTML
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Try several approaches to find the source URL:
      
      // 1. Look for canonical link
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink && canonicalLink.getAttribute('href')) {
        const canonicalUrl = canonicalLink.getAttribute('href');
        if (!canonicalUrl?.includes('news.google.com')) {
          logger.info(`Found canonical link: ${canonicalUrl}`);
          return canonicalUrl as string;
        }
      }
      
      // 2. Look for article source URL in specific Google News elements
      const articleLinks = document.querySelectorAll('a[data-n-au]');
      if (articleLinks.length > 0) {
        const firstLink = articleLinks[0].getAttribute('href');
        if (firstLink && !firstLink.includes('news.google.com')) {
          logger.info(`Found article source link: ${firstLink}`);
          return new URL(firstLink, url).toString();
        }
      }
      
      // 3. Look for any link with target="_blank" (often external article links)
      const externalLinks = document.querySelectorAll('a[target="_blank"]');
      for (let i = 0; i < externalLinks.length; i++) {
        const link = externalLinks[i].getAttribute('href');
        if (link && !link.includes('news.google.com') && !link.includes('support.google.com')) {
          logger.info(`Found external link: ${link}`);
          return new URL(link, url).toString();
        }
      }
      
      // 4. Extract from JavaScript variables in the page
      const scriptMatches = html.match(/window\.APP_INITIALIZATION_STATE\s*=\s*(\[\[.*?\]\])/);
      if (scriptMatches && scriptMatches[1]) {
        try {
          const data = JSON.parse(scriptMatches[1]);
          // Parse the Google News data structure (format may change)
          if (Array.isArray(data) && data.length > 0) {
            // Look for URLs in the data
            const jsonString = JSON.stringify(data);
            const urlMatches = jsonString.match(/"https?:\/\/[^"]+"/g);
            if (urlMatches && urlMatches.length > 0) {
              // Filter out Google URLs
              const externalUrls = urlMatches
                .map(u => u.replace(/"/g, ''))
                .filter(u => !u.includes('google.com') && !u.includes('gstatic.com'));
              
              if (externalUrls.length > 0) {
                logger.info(`Found URL in JS data: ${externalUrls[0]}`);
                return externalUrls[0];
              }
            }
          }
        } catch (e) {
          logger.warn(`Error parsing JS data: ${e}`);
        }
      }

      // If all else fails, look for meta refresh
      const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
      if (metaRefresh) {
        const content = metaRefresh.getAttribute('content');
        const match = content?.match(/URL='?([^']+)'?/i);
        if (match && match[1]) {
          logger.info(`Found meta refresh: ${match[1]}`);
          return match[1];
        }
      }

      // If we couldn't find the source URL, use a fallback approach
      // Extract domain from article title
      const titleElement = document.querySelector('title');
      if (titleElement) {
        const title = titleElement.textContent || '';
        const sourceDomainMatch = title.match(/\s-\s([^-]+)$/);
        if (sourceDomainMatch && sourceDomainMatch[1]) {
          const sourceName = sourceDomainMatch[1].trim();
          logger.info(`Extracted source from title: ${sourceName}`);
          
          // Use a search engine to look up the source website (this is a fallback)
          return `https://www.google.com/search?q=${encodeURIComponent(title)}+site:${encodeURIComponent(sourceName)}`;
        }
      }

      logger.warn(`Could not extract source URL from Google News URL: ${url}`);
      return url;
    } catch (error) {
      logger.warn(`Error resolving Google News URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url;
    }
  }
}

export default new RedirectService();