import axios from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from '../utils/logger';
import config from '../config';

export class SummarizerService {
  private httpClient = axios.create({ timeout: 20000 });
  private prompt = config.SUMMARY_PROMPT;

  constructor() {
    if (!config.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured');
      throw new Error('OpenAI API key missing');
    }

    axiosRetry(this.httpClient, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
  }

  async summarizeContent(content: string, title: string): Promise<string> {
    if (!content || content.length < 100) {
      logger.warn('Content too short to summarize');
      return content; // return original content if too short
    }

    const requestPayload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.prompt },
        { role: 'user', content: `Title: ${title}\n\nContent: ${content.substring(0, 8000)}` }
      ],
      max_tokens: 250,
    };

    try {
      logger.info(`Summarizing content: ${title}`);

      const response = await this.httpClient.post('https://api.openai.com/v1/chat/completions', requestPayload, {
        headers: {
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const summary = response.data.choices[0].message.content.trim();
      logger.info(`Summary successful: ${title}`);
      return summary;
    } catch (error) {
      logger.error(`Error summarizing content "${title}":`, error);
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}