# Immigration News Aggregation System Documentation

## Overview

This system automatically collects, processes, and stores immigration news articles from various sources. It utilizes Google News RSS feeds, content scraping services, AI-powered summarization, and MongoDB for storage.

## System Architecture

### Core Components

The system is organized around several key services that work together to fetch, process, and store news articles:

#### 1. RSS Service (`src/services/RssService.ts`)
- Fetches immigration news articles from Google News RSS feeds
- Parses and extracts relevant metadata (title, link, publication date, source)
- Sorts articles by date and prepares them for processing

#### 2. Redirect Service (`src/services/RedirectService.ts`) 
- Resolves Google News redirect URLs to their actual article destinations
- Uses Puppeteer to handle client-side redirects and tracking parameters
- Ensures accurate source URL tracking

#### 3. Scraper Service (`src/services/ScraperService.ts`)
- Extracts article content from the resolved URLs
- Interfaces with the Spider.cloud API for content extraction
- Handles extraction of metadata (title, author, publication date)

#### 4. Summarizer Service (`src/services/SummarizerService.ts`)
- Generates concise summaries of article content using OpenAI's GPT-4o-mini API
- Applies a specialized prompt focused on immigration news context
- Handles API errors and retries with exponential backoff

#### 5. Database Service (`src/services/DatabaseService.ts`)
- Manages MongoDB operations for storing news articles and processed URLs
- Handles deduplication of articles and URLs
- Provides methods to query news by recency and category

#### 6. News Scheduler (`src/schedulers/newsScheduler.ts`)
- Coordinates the entire news processing pipeline
- Runs periodically based on a configurable schedule (default: every 30 minutes)
- Manages browser instances for content scraping
- Handles errors and ensures proper resource cleanup

### Data Models

#### 1. News Article (`src/models/News.ts`)
- Stores processed news articles with their metadata
- Includes fields for headline, summary, source, publication date, categories, etc.
- Includes indexing for efficient queries

#### 2. Processed URL (`src/models/ProcessedURL.ts`)
- Tracks which URLs have been processed to prevent redundant processing
- Records processing status and links to created articles
- Helps manage the processing workflow

### API Layer

#### Controllers and Routes (`src/controllers/NewsController.ts`, `src/routes/newsRoutes.ts`)
- Provides RESTful API endpoints for accessing news data
- Includes endpoints for recent news and category-based filtering
- Handles error responses and pagination

### Configuration and Utilities

#### 1. Config (`src/config/index.ts`)
- Centralizes environment variables and configuration settings
- Manages API keys, MongoDB URI, and scheduler settings

#### 2. Logger (`src/utils/logger.ts`)
- Provides structured logging throughout the application
- Records different log levels (info, warn, error)
- Outputs to console and log files

#### 3. Error Handler (`src/utils/errorHandler.ts`)
- Provides global error handling for Express routes
- Ensures consistent error responses

## Process Flow

1. The scheduler initiates at application startup and runs on a configured schedule
2. RSS feed is fetched from Google News for immigration-related articles
3. For each article:
   - URL is checked against processed URLs to avoid duplication
   - Google News redirect URL is resolved to the actual article URL
   - Article content is scraped using the Spider.cloud API
   - Content is summarized using OpenAI's GPT model
   - Article data is saved to MongoDB
   - URL is marked as processed
4. API endpoints make the processed data available for consumption

## Configuration

The system uses environment variables (via a `.env` file) for configuration, including:
- `PORT`: Server port (default: 3030)
- `MONGODB_URI`: MongoDB connection string
- `SPIDER_CLOUD_API_KEY`: API key for content scraping
- `OPENAI_API_KEY`: API key for the summarization service
- `RSS_CRON_SCHEDULE`: Cron schedule for news processing (default: every 30 minutes)
- `LOG_LEVEL`: Logging verbosity level
- `SUMMARY_PROMPT`: Custom prompt for the AI summarization

## Key Features

1. **Automated News Collection**
   - Periodic polling of Google News for immigration updates
   - Configurable scheduling via cron expressions

2. **Content Extraction**
   - Handles redirects and tracking parameters in news links
   - Uses professional Spider.cloud API for robust content extraction

3. **AI-Powered Summarization**
   - Generates concise, contextual summaries using GPT-4o-mini
   - Custom prompt engineering for immigration-specific content

4. **Deduplication**
   - Prevents redundant processing of the same articles
   - Tracks processed URLs to optimize system resources

5. **RESTful API**
   - Endpoints for retrieving recent news
   - Category-based filtering capabilities

6. **Error Resilience**
   - Robust error handling throughout the pipeline
   - Error logging for diagnosing issues
   - Separation of process-wide vs. article-specific failures

7. **Scalability Considerations**
   - Database indexing for query optimization
   - Resource management (browser instances)
   - Configurable processing limits

## File-by-File Breakdown

1. `src/app.ts`
   - Entry point for the application
   - Sets up Express server, database connection, and scheduler
   - Configures middleware and routes
   - Implements graceful shutdown

2. `src/config/index.ts`
   - Central configuration management
   - Loads environment variables and provides defaults

3. `src/config/database.ts`
   - Database connection setup and management
   - Handles connection errors and disconnection

4. `src/controllers/NewsController.ts`
   - API route handlers for news data
   - Processes request parameters and formats responses

5. `src/models/News.ts`
   - MongoDB schema definition for news articles
   - Defines indexes and helper methods

6. `src/models/ProcessedURL.ts`
   - MongoDB schema for tracking processed URLs
   - Prevents redundant processing

7. `src/routes/newsRoutes.ts`
   - Defines API route paths
   - Maps routes to controller methods

8. `src/schedulers/newsScheduler.ts`
   - Manages periodic news processing
   - Coordinates the entire processing pipeline

9. `src/services/RssService.ts`
   - Fetches and parses Google News RSS feeds
   - Extracts metadata from feed items

10. `src/services/RedirectService.ts`
    - Resolves redirect URLs to final destinations
    - Handles Google News and other redirect types

11. `src/services/ScraperService.ts`
    - Interfaces with Spider.cloud API
    - Extracts article content and metadata

12. `src/services/SummarizerService.ts`
    - Communicates with OpenAI API
    - Generates article summaries with retry logic

13. `src/services/DatabaseService.ts`
    - Manages database operations
    - Handles article saving and URL tracking

14. `src/utils/logger.ts`
    - Configures Winston logger
    - Provides structured logging

15. `src/utils/errorHandler.ts`
    - Global error handling middleware
    - Standardizes error responses

16. `tsconfig.json`
    - TypeScript configuration
    - Compiler options and settings

17. `package.json`
    - Project metadata and dependencies
    - NPM scripts for development and production

## Future Improvements

Based on the codebase, several potential improvements could be implemented:

1. **Resilience & Error Handling**
   - Implementing retry mechanisms with exponential backoff
   - Adding circuit breakers for external services
   - Developing fallback strategies for content processing

2. **Content Quality Enhancements**
   - Implementing paywall detection
   - Adding duplicate detection using content fingerprinting
   - Enhancing entity extraction for better metadata
   - Improving LLM prompting techniques

3. **Performance Optimization**
   - Implementing batch processing for URLs
   - Adding caching strategies
   - Optimizing database queries with advanced indexing

4. **Advanced Features**
   - Developing full-text search capabilities
   - Implementing advanced content categorization
   - Adding webhook functionality for real-time updates
   - Creating custom RSS feed generation

5. **Monitoring & Observability**
   - Enhancing structured logging
   - Adding performance metrics collection
   - Implementing comprehensive health checks
   - Developing an alerting system

## Conclusion

The Immigration News Aggregation System provides a robust framework for automated news collection and processing. It utilizes modern technologies and APIs to deliver a reliable and scalable solution for tracking immigration news. The modular architecture allows for easy maintenance and future enhancements.