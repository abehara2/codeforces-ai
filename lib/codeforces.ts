import * as cheerio from "cheerio";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

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

export async function fetchCodeforcesProblem(problemUrl: string): Promise<ProblemData> {
  const { contestId, problemIndex, url } = parseCodeforcesUrl(problemUrl);
  const problemId = `${contestId}/${problemIndex}`;
  
  console.log("[fetchCodeforcesProblem] Fetching from URL:", url);

  let browser;
  try {
    // Launch headless browser with chromium for serverless environments
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

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

    return {
      html,
      text,
      title,
      url,
      problemId,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
