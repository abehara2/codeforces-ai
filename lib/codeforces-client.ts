// Client-side Codeforces problem fetcher
// Uses CORS proxy to fetch from browser (bypasses Codeforces bot detection)

export interface ProblemData {
  html: string;
  text: string;
  title: string;
  url: string;
  problemId: string;
}

export function parseCodeforcesUrl(input: string): { contestId: string; problemIndex: string; url: string } {
  let url = input.trim();
  
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  const parsed = new URL(url);
  
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

  throw new Error("Could not parse problem from URL");
}

export async function fetchCodeforcesProblemClient(problemUrl: string): Promise<ProblemData> {
  const { contestId, problemIndex, url } = parseCodeforcesUrl(problemUrl);
  const problemId = `${contestId}/${problemIndex}`;

  // Use allorigins.win as a CORS proxy - it fetches the page and returns it
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  
  console.log("[Client] Fetching via CORS proxy:", proxyUrl);

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch problem (HTTP ${response.status})`);
  }

  const htmlContent = await response.text();
  console.log("[Client] HTML content length:", htmlContent.length);

  // Parse HTML using DOMParser (browser API)
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // Extract the problem statement from problemindexholder class
  const problemHolder = doc.querySelector(".problemindexholder");

  if (!problemHolder) {
    if (htmlContent.includes("Codeforces is temporarily unavailable")) {
      throw new Error("Codeforces is temporarily unavailable");
    }
    throw new Error("Could not find problem content");
  }

  const html = problemHolder.innerHTML;
  const text = problemHolder.textContent?.trim() || "";
  const titleEl = doc.querySelector(".title");
  const title = titleEl?.textContent?.trim() || "";

  console.log("[Client] Problem fetched:", { problemId, title, htmlLength: html.length });

  return {
    html,
    text,
    title,
    url,
    problemId,
  };
}

