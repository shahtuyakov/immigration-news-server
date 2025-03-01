import { Request, Response } from 'express';
import databaseService from '../services/DatabaseService';
import { logger } from '../utils/logger';

export const getRecentNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const news = await databaseService.getRecentNews(limit);
    res.status(200).json(news);
  } catch (error) {
    logger.error('Error in getRecentNews controller:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};

export const getNewsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const news = await databaseService.getNewsByCategory(category, limit);
    res.status(200).json(news);
  } catch (error) {
    logger.error(`Error in getNewsByCategory controller for ${req.params.category}:`, error);
    res.status(500).json({ error: 'Failed to fetch news by category' });
  }
};

