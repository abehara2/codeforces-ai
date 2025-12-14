# Codeforces Scraper Service

A stealth web scraping service for fetching Codeforces problems, using Playwright with stealth plugin to avoid bot detection.

## Features

- **Stealth Mode**: Uses `puppeteer-extra-plugin-stealth` to bypass bot detection
- **Playwright**: Modern, reliable browser automation
- **API Key Auth**: Optional API key authentication
- **Health Checks**: Built-in health endpoint for monitoring

## Local Development

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Health Check
```
GET /health
```
Returns service status.

### Scrape Problem
```
POST /scrape
Content-Type: application/json
X-API-Key: your-api-key (if SCRAPER_API_KEY is set)

{
  "url": "https://codeforces.com/problemset/problem/1/A"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "html": "<problem HTML>",
    "text": "Problem text content",
    "title": "A. Theatre Square",
    "url": "https://codeforces.com/problemset/problem/1/A"
  }
}
```

## Deploy to Render

### Option 1: Using Render Blueprint

1. Push this directory to a Git repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your repository
5. Render will auto-detect `render.yaml` and configure the service

### Option 2: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your repository
4. Configure:
   - **Name**: codeforces-scraper
   - **Root Directory**: scraper-service
   - **Runtime**: Docker
   - **Plan**: Starter ($7/month) - required for Chromium
5. Add environment variables:
   - `PORT`: 3001
   - `SCRAPER_API_KEY`: (generate a secure key)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3001) | No |
| `SCRAPER_API_KEY` | API key for authentication | No (but recommended) |

## Integrating with Main App

In your main app, add the scraper service URL and API key to your environment:

```env
SCRAPER_SERVICE_URL=https://your-scraper.onrender.com
SCRAPER_API_KEY=your-api-key
```

Then call it from your codeforces.ts:

```typescript
const response = await fetch(`${process.env.SCRAPER_SERVICE_URL}/scrape`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.SCRAPER_API_KEY!,
  },
  body: JSON.stringify({ url: problemUrl }),
});
```
