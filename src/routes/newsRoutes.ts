import express from 'express';
import { getRecentNews, getNewsByCategory } from '../controllers/NewsController';

const router = express.Router();

router.get('/', getRecentNews);
router.get('/category/:category', getNewsByCategory);

export default router;