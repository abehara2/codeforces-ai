/**
 * Browserbase Problem Sync Script
 *
 * This script fetches all Codeforces problems using the official API,
 * then scrapes each problem's HTML using Browserbase and stores it in the database.
 *
 * Usage:
 *   npm run sync:problems                    # Sync all problems
 *   npm run sync:problems -- --stop-on-dup   # Stop when hitting existing problems
 *   npm run sync:problems -- --limit=100     # Only sync 100 problems
 *
 * Environment variables required:
 *   BROWSERBASE_API_KEY      - Your Browserbase API key
 *   BROWSERBASE_PROJECT_ID   - Your Browserbase project ID
 *   DATABASE_URL             - PostgreSQL connection string
 */

import { PrismaClient } from "@prisma/client";
import Browserbase from "@browserbasehq/sdk";
import { Builder, By, until, WebDriver } from "selenium-webdriver";
import http from "http";

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const STOP_ON_DUPLICATES = args.includes("--stop-on-dup");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

// Rate limiting - be respectful to Codeforces
const DELAY_BETWEEN_REQUESTS_MS = 2000;
const BATCH_SIZE = 10; // Pause longer after every batch
const BATCH_DELAY_MS = 10000;
const SESSION_RESTART_INTERVAL = 30; // Restart browser session every N problems

interface CodeforcesProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  points?: number;
  rating?: number;
  tags: string[];
}

interface CodeforcesApiResponse {
  status: string;
  result?: {
    problems: CodeforcesProblem[];
  };
  comment?: string;
}

async function fetchProblemList(): Promise<CodeforcesProblem[]> {
  console.log("📋 Fetching problem list from Codeforces API...");

  const response = await fetch("https://codeforces.com/api/problemset.problems");

  if (!response.ok) {
    throw new Error(`Failed to fetch problem list: HTTP ${response.status}`);
  }

  const data: CodeforcesApiResponse = await response.json();

  if (data.status !== "OK" || !data.result) {
    throw new Error(`Codeforces API error: ${data.comment || "Unknown error"}`);
  }

  // Sort by contestId descending (newest first) for STOP_ON_DUPLICATES to work well
  const problems = data.result.problems.sort((a, b) => b.contestId - a.contestId);

  console.log(`✅ Found ${problems.length} problems`);
  return problems;
}

async function createBrowserbaseSession(): Promise<{ driver: WebDriver; sessionId: string }> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error(
      "Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID environment variables"
    );
  }

  const bb = new Browserbase({ apiKey });

  const session = await bb.sessions.create({
    projectId,
    browserSettings: {
      fingerprint: {
        browserListQuery: "last 2 Chrome versions",
        httpVersion: "2",
        locales: ["en-US", "en"],
        operatingSystems: ["macos"],
        screen: { maxWidth: 1920, maxHeight: 1080, minWidth: 1024, minHeight: 768 },
      },
    },
  });

  console.log(`🌐 Created Browserbase session: ${session.id}`);

  // Set up a custom HTTP agent to include the signing key in headers
  const customHttpAgent = new http.Agent({});
  const originalAddRequest = (http.Agent.prototype as any).addRequest;
  (customHttpAgent as any).addRequest = function (req: any, options: any) {
    req.setHeader("x-bb-signing-key", session.signingKey);
    return originalAddRequest.call(this, req, options);
  };

  const driver = await new Builder()
    .forBrowser("chrome")
    .usingHttpAgent(customHttpAgent)
    .usingServer(session.seleniumRemoteUrl)
    .build();

  return { driver, sessionId: session.id };
}

async function scrapeProblem(
  driver: WebDriver,
  contestId: number,
  index: string
): Promise<{ html: string; text: string; title: string } | null> {
  const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;

  try {
    await driver.get(url);

    // Wait for the problem content to load
    await driver.wait(until.elementLocated(By.css(".problemindexholder")), 15000);

    // Check for Cloudflare challenge
    const pageSource = await driver.getPageSource();
    if (pageSource.includes("Just a moment")) {
      console.log(`   ⏳ Cloudflare challenge detected, waiting...`);
      await driver.sleep(5000);
    }

    // Get the problem holder element
    const problemHolder = await driver.findElement(By.css(".problemindexholder"));
    const html = await problemHolder.getAttribute("innerHTML");
    const text = await problemHolder.getText();

    // Get the title
    const titleElement = await driver.findElement(By.css(".title"));
    const title = await titleElement.getText();

    return { html, text, title };
  } catch (error) {
    console.error(`   ❌ Failed to scrape ${contestId}/${index}:`, error);
    return null;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Codeforces Problem Sync Script");
  console.log(`   STOP_ON_DUPLICATES: ${STOP_ON_DUPLICATES}`);
  console.log(`   LIMIT: ${LIMIT ?? "none"}`);
  console.log("");

  // Fetch all problems from Codeforces API
  const problems = await fetchProblemList();

  // Apply limit if specified
  const problemsToProcess = LIMIT ? problems.slice(0, LIMIT) : problems;

  console.log(`\n📊 Processing ${problemsToProcess.length} problems...\n`);

  // Create initial Browserbase session
  let { driver, sessionId } = await createBrowserbaseSession();

  let scraped = 0;
  let skipped = 0;
  let failed = 0;
  let duplicates = 0;
  let scrapedSinceRestart = 0;

  try {
    for (let i = 0; i < problemsToProcess.length; i++) {
      const problem = problemsToProcess[i];
      const problemId = `${problem.contestId}/${problem.index}`;

      // Check if already in cache
      const existing = await prisma.problemCache.findUnique({
        where: { problemId },
      });

      if (existing) {
        duplicates++;
        if (STOP_ON_DUPLICATES) {
          console.log(`\n⛔ Hit existing problem ${problemId}, stopping (STOP_ON_DUPLICATES=true)`);
          console.log(`   Found ${duplicates} consecutive duplicates.`);
          break;
        }
        // Skip existing problems when not stopping
        skipped++;
        continue;
      }

      // Restart session every SESSION_RESTART_INTERVAL problems
      if (scrapedSinceRestart >= SESSION_RESTART_INTERVAL) {
        console.log(`\n🔄 Restarting session after ${SESSION_RESTART_INTERVAL} problems...`);
        await driver.quit();
        await sleep(2000); // Brief pause before creating new session
        ({ driver, sessionId } = await createBrowserbaseSession());
        scrapedSinceRestart = 0;
      }

      console.log(
        `[${i + 1}/${problemsToProcess.length}] Scraping ${problemId}: ${problem.name}`
      );

      const result = await scrapeProblem(driver, problem.contestId, problem.index);

      if (result) {
        await prisma.problemCache.create({
          data: {
            problemId,
            url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
            title: result.title,
            html: result.html,
            text: result.text,
          },
        });
        console.log(`   ✅ Saved ${problemId}`);
        scraped++;
        scrapedSinceRestart++;
      } else {
        failed++;
        scrapedSinceRestart++; // Count failed attempts too to avoid stuck sessions
      }

      // Rate limiting
      await sleep(DELAY_BETWEEN_REQUESTS_MS);

      // Longer pause after each batch
      if ((i + 1) % BATCH_SIZE === 0) {
        console.log(`\n⏸️  Pausing for ${BATCH_DELAY_MS / 1000}s after batch...\n`);
        await sleep(BATCH_DELAY_MS);
      }
    }
  } finally {
    // Clean up
    console.log("\n🧹 Cleaning up...");
    await driver.quit();
    await prisma.$disconnect();
  }

  console.log("\n📊 Summary:");
  console.log(`   ✅ Scraped: ${scraped}`);
  console.log(`   ⏭️  Skipped (already cached): ${skipped}`);
  console.log(`   🔄 Duplicates found: ${duplicates}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n✨ Done!`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
