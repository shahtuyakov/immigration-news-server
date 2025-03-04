import axios from 'axios';
import { logger } from '../utils/logger';

export class RedirectService {
  async getFinalUrl(url: string): Promise<string> {
    try {
      // First check if it's a Google News URL and handle specially
      if (url.includes('news.google.com')) {
        return this.handleGoogleNewsUrl(url);
      }

      // For non-Google URLs, follow redirects with axios
      const response = await axios.head(url, {
        maxRedirects: 10,
        timeout: 10000,
        validateStatus: (status) => status < 400, // Accept all non-error statuses
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Get final URL after redirects
      const finalUrl = response.request.res.responseUrl || url;
      logger.info(`Followed redirects: ${url} → ${finalUrl}`);
      return finalUrl;
    } catch (error) {
      logger.warn(`Error following redirects for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url; // Return original URL if redirect fails
    }
  }

  private async handleGoogleNewsUrl(url: string): Promise<string> {
    try {
      // Try to extract URL parameter first (most reliable method)
      const parsedUrl = new URL(url);
      
      // Google News URLs often have a 'url' parameter
      const urlParam = parsedUrl.searchParams.get('url');
      if (urlParam) {
        const decodedUrl = decodeURIComponent(urlParam);
        logger.info(`Extracted URL from Google News parameter: ${decodedUrl}`);
        return decodedUrl;
      }

      // If no URL parameter, try to extract from 'article' parameter
      const articleParam = parsedUrl.searchParams.get('article');
      if (articleParam) {
        logger.info(`Found article parameter in Google URL: ${articleParam}`);
        // Try to extract the final URL from the article parameter if possible
        // (This is a fallback and may require further processing)
      }

      // If no parameters found, try making a request to follow redirects
      const response = await axios.get(url, {
        maxRedirects: 0, // Don't follow redirects automatically
        validateStatus: (status) => true, // Accept all status codes
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Check for 3xx redirect status
      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        const redirectUrl = new URL(
          response.headers.location,
          response.request.res.responseUrl
        ).toString();
        
        logger.info(`Found redirect in headers: ${redirectUrl}`);
        return this.cleanGoogleUrl(redirectUrl);
      }

      // Look for meta refresh tags in HTML
      const html = response.data?.toString() || '';
      const metaRefreshMatch = html.match(/<meta[^>]*?http-equiv=["']?refresh["']?[^>]*?content=["']?\d+;\s*url=["']?([^"'>]+)["']?/i);
      
      if (metaRefreshMatch && metaRefreshMatch[1]) {
        const metaUrl = metaRefreshMatch[1];
        logger.info(`Found meta refresh redirect: ${metaUrl}`);
        return this.cleanGoogleUrl(metaUrl);
      }

      // Look for canonical link
      const canonicalMatch = html.match(/<link[^>]*?rel=["']?canonical["']?[^>]*?href=["']?([^"'>]+)["']?/i);
      
      if (canonicalMatch && canonicalMatch[1]) {
        const canonicalUrl = canonicalMatch[1];
        logger.info(`Found canonical link: ${canonicalUrl}`);
        return this.cleanGoogleUrl(canonicalUrl);
      }

      logger.warn(`Could not extract source URL from Google News URL: ${url}`);
      return url;
    } catch (error) {
      logger.warn(`Error handling Google News URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url;
    }
  }

  private cleanGoogleUrl(url: string): string {
    try {
      // Decode URL components
      let cleanUrl = decodeURIComponent(url);
      
      // Remove Google tracking parameters
      const urlObj = new URL(cleanUrl);
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 
                            'utm_content', 'partner', 'oq', 'ved', 'guccounter', 'guce_referrer'];
      
      paramsToRemove.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      cleanUrl = urlObj.toString();
      
      // Remove trailing ? if all parameters were removed
      return cleanUrl.replace(/\?$/, '');
    } catch (error) {
      logger.warn(`Error cleaning URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url;
    }
  }
}

export default new RedirectService();