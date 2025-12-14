import * as cheerio from "cheerio";
import { prisma } from "./prisma";

// Detect if running on Vercel/serverless
const isVercel = process.env.VERCEL === "1";

// Residential proxy URL (e.g., from Bright Data, Oxylabs, SmartProxy)
// Format: http://username:password@proxy.example.com:port
const RESIDENTIAL_PROXY_URL = process.env.RESIDENTIAL_PROXY_URL;

// External scraper service (Render-hosted Playwright with stealth)
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

export interface ProblemData {
  html: string;
  text: string;
  title: string;
  url: string;
  problemId: string;
}

// Parses a Codeforces URL and extracts the problem ID
export function parseCodeforcesUrl(input: string): { contestId: string; problemIndex: string; url: string } {
  // Clean up the input
  let url = input.trim();
  
  // Add https:// if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  try {
    const parsed = new URL(url);
    
    // Check if it's a codeforces domain
    if (!parsed.hostname.includes("codeforces.com")) {
      throw new Error("Not a Codeforces URL");
    }

    const pathParts = parsed.pathname.split("/").filter(Boolean);

    // Format: /problemset/problem/{contestId}/{problemIndex}
    if (pathParts[0] === "problemset" && pathParts[1] === "problem" && pathParts.length >= 4) {
      return {
        contestId: pathParts[2],
        problemIndex: pathParts[3],
        url: `https://codeforces.com/problemset/problem/${pathParts[2]}/${pathParts[3]}`,
      };
    }

    // Format: /contest/{contestId}/problem/{problemIndex}
    if (pathParts[0] === "contest" && pathParts[2] === "problem" && pathParts.length >= 4) {
      return {
        contestId: pathParts[1],
        problemIndex: pathParts[3],
        url: `https://codeforces.com/contest/${pathParts[1]}/problem/${pathParts[3]}`,
      };
    }

    // Format: /gym/{gymId}/problem/{problemIndex}
    if (pathParts[0] === "gym" && pathParts[2] === "problem" && pathParts.length >= 4) {
      return {
        contestId: pathParts[1],
        problemIndex: pathParts[3],
        url: `https://codeforces.com/gym/${pathParts[1]}/problem/${pathParts[3]}`,
      };
    }

    throw new Error("Could not parse problem from URL. Make sure it's a valid Codeforces problem URL.");
  } catch (e) {
    if (e instanceof Error && e.message !== "Not a Codeforces URL" && !e.message.startsWith("Could not parse")) {
      throw new Error("Invalid URL format: " + (e instanceof Error ? e.message : String(e)));
    }
    throw e;
  }
}

// Fetch problem using external scraper service
async function fetchViaScraperService(url: string): Promise<{ html: string; text: string; title: string }> {
  console.log("[fetchViaScraperService] Calling scraper service for:", url);
  
  const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SCRAPER_API_KEY && { "X-API-Key": SCRAPER_API_KEY }),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Scraper service returned ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Scraper service failed");
  }

  return {
    html: result.data.html,
    text: result.data.text,
    title: result.data.title,
  };
}

export async function fetchCodeforcesProblem(problemUrl: string): Promise<ProblemData> {
  const { contestId, problemIndex, url } = parseCodeforcesUrl(problemUrl);
  const problemId = `${contestId}/${problemIndex}`;
  
  // Check cache first
  const cached = await prisma.problemCache.findUnique({
    where: { problemId },
  });

  if (cached) {
    console.log("[fetchCodeforcesProblem] Cache hit for:", problemId);
    return {
      html: cached.html,
      text: cached.text,
      title: cached.title,
      url: cached.url,
      problemId: cached.problemId,
    };
  }

  console.log("[fetchCodeforcesProblem] Cache miss, fetching from URL:", url);

  // Try external scraper service first if configured
  if (SCRAPER_SERVICE_URL) {
    try {
      const { html, text, title } = await fetchViaScraperService(url);
      
      const problemData: ProblemData = {
        html,
        text,
        title,
        url,
        problemId,
      };

      // Cache the result
      await prisma.problemCache.create({
        data: {
          problemId,
          url,
          title,
          html,
          text,
        },
      });
      console.log("[fetchCodeforcesProblem] Cached problem from scraper service:", problemId);

      return problemData;
    } catch (error) {
      console.error("[fetchCodeforcesProblem] Scraper service failed, falling back to local:", error);
      // Fall through to local scraping
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;
  try {
    // Use different browser setup for local vs Vercel
    if (isVercel) {
      // Production: use puppeteer-core with chromium-min and residential proxy
      const puppeteer = await import("puppeteer-core");
      const chromium = await import("@sparticuz/chromium-min");
      
      const launchArgs = [...chromium.default.args];
      
      // Add proxy if configured
      if (RESIDENTIAL_PROXY_URL) {
        console.log("[fetchCodeforcesProblem] Using residential proxy");
        launchArgs.push(`--proxy-server=${RESIDENTIAL_PROXY_URL}`);
      }
      
      browser = await puppeteer.default.launch({
        args: launchArgs,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.default.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar"
        ),
        headless: true,
      });
    } else {
      // Local: use full puppeteer with bundled Chrome
      const puppeteer = await import("puppeteer");
      
      const launchArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ];
      
      // Add proxy if configured (for local testing)
      if (RESIDENTIAL_PROXY_URL) {
        console.log("[fetchCodeforcesProblem] Using residential proxy");
        launchArgs.push(`--proxy-server=${RESIDENTIAL_PROXY_URL}`);
      }
      
      browser = await puppeteer.default.launch({
        headless: true,
        args: launchArgs,
      });
    }

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // Navigate to the problem page
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    if (!response) {
      throw new Error("Failed to load page");
    }

    const status = response.status();
    console.log("[fetchCodeforcesProblem] Response status:", status);

    if (status === 404) {
      throw new Error("Problem not found on Codeforces. Check if the URL is correct.");
    }

    if (status !== 200) {
      throw new Error(`Failed to fetch problem (HTTP ${status})`);
    }

    // Wait for the problem content to appear
    await page.waitForSelector(".problemindexholder", { timeout: 10000 }).catch(() => {
      // If selector not found, continue and check content
    });

    const htmlContent = await page.content();
    console.log("[fetchCodeforcesProblem] HTML content length:", htmlContent.length);

    const $ = cheerio.load(htmlContent);

    // Extract the problem statement from problemindexholder class
    const problemHolder = $(".problemindexholder");
    console.log("[fetchCodeforcesProblem] problemindexholder elements found:", problemHolder.length);

    if (problemHolder.length === 0) {
      // Check for common error indicators
      if (htmlContent.includes("Codeforces is temporarily unavailable")) {
        throw new Error("Codeforces is temporarily unavailable. Please try again later.");
      }
      if (htmlContent.includes("Just a moment")) {
        throw new Error("Codeforces is showing a challenge page. Please try again in a moment.");
      }
      
      throw new Error("Could not find problem content. The problem may not exist.");
    }

    // Get the HTML content
    const html = problemHolder.html() || "";

    // Also extract plain text for AI context
    const text = problemHolder.text().trim();

    // Extract problem title
    const title = $(".title").first().text().trim();
    console.log("[fetchCodeforcesProblem] Problem title:", title);

    const problemData: ProblemData = {
      html,
      text,
      title,
      url,
      problemId,
    };

    // Cache the result
    await prisma.problemCache.create({
      data: {
        problemId,
        url,
        title,
        html,
        text,
      },
    });
    console.log("[fetchCodeforcesProblem] Cached problem:", problemId);

    return problemData;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
