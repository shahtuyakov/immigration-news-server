import axios from 'axios';
import { logger } from '../utils/logger';
import config from '../config';

export class SummarizerService {
  private apiKey: string;
  private apiUrl: string;
  
  constructor() {
    this.apiKey = config.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    if (!this.apiKey) {
      logger.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }
  }
  
  async summarizeContent(content: string, title: string): Promise<string> {
    try {
      if (!content || content.length < 100) {
        logger.warn('Content too short to summarize');
        return content;
      }
      
      const response = await axios.post(this.apiUrl, {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a news summarizer assistant. Provide a concise summary of the news article in 3-4 sentences highlighting the key points, implications, and relevant context. Focus specifically on immigration policy and regulations.'
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent: ${content.substring(0, 8000)}`
          }
        ],
        max_tokens: 250,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`OpenAI API returned status ${response.status}`);
      }
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Error summarizing content:', error);
      throw new Error(`Content summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new SummarizerService();