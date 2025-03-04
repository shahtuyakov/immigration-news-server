import axios from 'axios';
import { logger } from '../utils/logger';

export class RedirectService {
    async getFinalUrl(url: string): Promise<string> {
      try {
        if (url.includes('news.google.com')) {
          return this.handleGoogleNewsUrl(url);
        }
  
        // Fixed standard request configuration
        const response = await axios.get(url, {
          maxRedirects: 10,
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
  
        // Get final URL properly
        const finalUrl = response.config.url || url;
        logger.info(`Followed redirects: ${url} → ${finalUrl}`);
        return finalUrl;
      } catch (error) {
        logger.warn(`Error following redirects for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return url;
      }
    }
  
    private async handleGoogleNewsUrl(url: string): Promise<string> {
      try {
        const parsedUrl = new URL(url);
        const urlParam = parsedUrl.searchParams.get('url');
        
        if (urlParam) {
          // Add URI decoding for Google News parameters
          const decodedUrl = decodeURIComponent(urlParam);
          logger.info(`Extracted URL from Google News parameter: ${decodedUrl}`);
          return decodedUrl;
        }
  
        // Fixed response type and headers
        const response = await axios.get(url, {
          maxRedirects: 0, // Don't follow redirects automatically
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          responseType: 'text' // Correct response type
        });
  
        const html = response.data;
        
        // Check for meta refresh first
        const metaRefreshMatch = html.match(/<meta http-equiv="refresh" content="\d+;url='?([^'">]+)"?/i);
        if (metaRefreshMatch?.[1]) {
          return this.cleanGoogleUrl(metaRefreshMatch[1]);
        }
  
        // Then check canonical
        const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
        if (canonicalMatch?.[1]) {
          return this.cleanGoogleUrl(canonicalMatch[1]);
        }
  
        // Then JavaScript redirects
        const redirectMatch = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/i) 
                           || html.match(/window\.location\s*=\s*['"]([^'"]+)['"]/i);
        if (redirectMatch?.[1]) {
          return this.cleanGoogleUrl(redirectMatch[1]);
        }
  
        return url;
      } catch (error) {
        logger.warn(`Error handling Google News URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return url;
      }
    }
  
    private cleanGoogleUrl(url: string): string {
      // Remove Google tracking parameters
      return decodeURIComponent(url)
        .replace(/(?:utm_|partner|oq=|ved=).*?(?=&|$)/g, '')
        .replace(/\?$/, ''); // Remove trailing ?
    }
  }

export default new RedirectService();