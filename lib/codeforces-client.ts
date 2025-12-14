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
  // Validate URL format first
  parseCodeforcesUrl(problemUrl);

  // Use server-side API to fetch (avoids CORS issues)
  const response = await fetch(`/api/problem?url=${encodeURIComponent(problemUrl)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch problem (HTTP ${response.status})`);
  }

  const data = await response.json();
  return data as ProblemData;
}

