import express from "express";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import * as cheerio from "cheerio";

// Enable stealth mode
chromium.use(stealth());

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.SCRAPER_API_KEY;

// Simple API key authentication middleware
function authenticate(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (API_KEY) {
    const providedKey =
      req.headers["x-api-key"] || req.query.apiKey;
    if (providedKey !== API_KEY) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  next();
}

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main scraping endpoint
app.post("/scrape", authenticate, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  // Validate it's a Codeforces URL
  if (!url.includes("codeforces.com")) {
    res.status(400).json({ error: "Only Codeforces URLs are supported" });
    return;
  }

  console.log(`[scrape] Starting scrape for: ${url}`);
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezoneId: "America/New_York",
    });

    const page = await context.newPage();

    // Add extra headers to appear more legitimate
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    });

    console.log(`[scrape] Navigating to: ${url}`);
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    if (!response) {
      throw new Error("Failed to load page - no response");
    }

    const status = response.status();
    console.log(`[scrape] Response status: ${status}`);

    if (status === 404) {
      res.status(404).json({
        error: "Problem not found on Codeforces. Check if the URL is correct.",
      });
      return;
    }

    if (status !== 200) {
      res.status(502).json({ error: `Failed to fetch problem (HTTP ${status})` });
      return;
    }

    // Wait for problem content with retry logic
    try {
      await page.waitForSelector(".problemindexholder", { timeout: 15000 });
    } catch {
      // Check for common blocking scenarios
      const content = await page.content();
      if (content.includes("Just a moment")) {
        res.status(503).json({
          error: "Codeforces is showing a challenge page. Please try again.",
        });
        return;
      }
      if (content.includes("Codeforces is temporarily unavailable")) {
        res.status(503).json({
          error: "Codeforces is temporarily unavailable.",
        });
        return;
      }
      console.log("[scrape] Problem selector not found, continuing anyway...");
    }

    const htmlContent = await page.content();
    console.log(`[scrape] Page content length: ${htmlContent.length}`);

    const $ = cheerio.load(htmlContent);

    // Extract problem content
    const problemHolder = $(".problemindexholder");

    if (problemHolder.length === 0) {
      // Final check for blocking
      if (htmlContent.includes("Just a moment")) {
        res.status(503).json({
          error: "Blocked by Cloudflare challenge. Please try again later.",
        });
        return;
      }

      res.status(404).json({
        error: "Could not find problem content. The problem may not exist.",
      });
      return;
    }

    const html = problemHolder.html() || "";
    const text = problemHolder.text().trim();
    const title = $(".title").first().text().trim();

    console.log(`[scrape] Successfully scraped: ${title}`);

    res.json({
      success: true,
      data: {
        html,
        text,
        title,
        url,
      },
    });
  } catch (error) {
    console.error("[scrape] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Scraper service running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API key required: ${API_KEY ? "yes" : "no"}`);
});
