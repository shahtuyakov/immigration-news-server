import axios from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from '../utils/logger';
import config from '../config';

export interface SummaryResult {
  summary: string;
  tags: string[];
}

export class SummarizerService {
  private httpClient = axios.create({ timeout: 30000 });
  private basePrompt = config.SUMMARY_PROMPT || 'Summarize content in 10-15 sentences, focusing specifically on immigration policy, key points, implications, and relevant context.';
  private enhancedPrompt = `${this.basePrompt}
  
After providing the summary, list 5-8 tags relevant to the content. Each tag should be a single word or short phrase highlighting key themes, policies, geographic regions, or stakeholders mentioned in the content.

Your response should be in this format:
SUMMARY: [Your detailed summary here]
TAGS: [tag1], [tag2], [tag3], [tag4], [tag5], [optional tag6], [optional tag7], [optional tag8]`;

  constructor() {
    if (!config.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured');
      throw new Error('OpenAI API key missing');
    }

    axiosRetry(this.httpClient, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
  }

  async summarizeContent(content: string, title: string): Promise<SummaryResult> {
    if (!content || content.length < 100) {
      logger.warn('Content too short to summarize');
      return { summary: content, tags: [] };
    }

    const requestPayload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.enhancedPrompt },
        { role: 'user', content: `Title: ${title}\n\nContent: ${content.substring(0, 8000)}` }
      ],
      max_tokens: 350,
    };

    try {
      logger.info(`Summarizing content: ${title}`);

      const response = await this.httpClient.post('https://api.openai.com/v1/chat/completions', requestPayload, {
        headers: {
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const responseContent = response.data.choices[0].message.content.trim();
      const result = this.parseResponse(responseContent);
      
      logger.info(`Summary successful: ${title}`);
      return result;
    } catch (error) {
      logger.error(`Error summarizing content "${title}":`, error);
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseResponse(responseContent: string): SummaryResult {
    try {
      // Try to extract summary and tags using the expected format
      const summaryMatch = responseContent.match(/SUMMARY:\s*([\s\S]*?)(?=TAGS:|$)/i);
      const tagsMatch = responseContent.match(/TAGS:\s*(.*?)$/i);
      
      let summary = '';
      let tags: string[] = [];
      
      if (summaryMatch && summaryMatch[1]) {
        summary = summaryMatch[1].trim();
      } else {
        // If format doesn't match, use the whole response as summary
        summary = responseContent;
      }
      
      if (tagsMatch && tagsMatch[1]) {
        tags = tagsMatch[1]
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
      
      return { summary, tags };
    } catch (error) {
      logger.warn('Error parsing AI response format, returning full text as summary', error);
      return { 
        summary: responseContent,
        tags: []
      };
    }
  }
}