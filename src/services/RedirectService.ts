import { chromium } from 'playwright';
import { logger } from '../utils/logger'; // Assumed logging utility

export class RedirectService {
  /**
   * Resolves the final article URL from a given URL, optionally using a source URL.
   * @param url The initial URL (e.g., Google News link)
   * @param sourceUrl Optional publisher base URL (e.g., "https://news.berkeley.edu")
   * @returns The resolved article URL
   */
  async getFinalUrl(url: string, sourceUrl: string | null = null): Promise<string> {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.setDefaultTimeout(30000); // Set 30s timeout
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      await page.goto(url, { waitUntil: 'networkidle' }); // Use networkidle instead of networkidle0

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