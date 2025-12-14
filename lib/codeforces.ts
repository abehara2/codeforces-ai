import { prisma } from "./prisma";

export interface ProblemData {
  html: string;
  text: string;
  title: string;
  url: string;
  problemId: string;
}

// Parses a Codeforces URL and extracts the problem ID
export function parseCodeforcesUrl(input: string): {
  contestId: string;
  problemIndex: string;
  url: string;
} {
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
    if (
      pathParts[0] === "problemset" &&
      pathParts[1] === "problem" &&
      pathParts.length >= 4
    ) {
      return {
        contestId: pathParts[2],
        problemIndex: pathParts[3],
        url: `https://codeforces.com/problemset/problem/${pathParts[2]}/${pathParts[3]}`,
      };
    }

    // Format: /contest/{contestId}/problem/{problemIndex}
    if (
      pathParts[0] === "contest" &&
      pathParts[2] === "problem" &&
      pathParts.length >= 4
    ) {
      return {
        contestId: pathParts[1],
        problemIndex: pathParts[3],
        url: `https://codeforces.com/contest/${pathParts[1]}/problem/${pathParts[3]}`,
      };
    }

    // Format: /gym/{gymId}/problem/{problemIndex}
    if (
      pathParts[0] === "gym" &&
      pathParts[2] === "problem" &&
      pathParts.length >= 4
    ) {
      return {
        contestId: pathParts[1],
        problemIndex: pathParts[3],
        url: `https://codeforces.com/gym/${pathParts[1]}/problem/${pathParts[3]}`,
      };
    }

    throw new Error(
      "Could not parse problem from URL. Make sure it's a valid Codeforces problem URL."
    );
  } catch (e) {
    if (
      e instanceof Error &&
      e.message !== "Not a Codeforces URL" &&
      !e.message.startsWith("Could not parse")
    ) {
      throw new Error(
        "Invalid URL format: " + (e instanceof Error ? e.message : String(e))
      );
    }
    throw e;
  }
}

/**
 * Fetches a Codeforces problem from the database cache.
 * Problems must be pre-synced using the sync-problems script.
 *
 * @param problemUrl - The Codeforces problem URL
 * @returns The problem data or throws an error if not found
 */
export async function fetchCodeforcesProblem(
  problemUrl: string
): Promise<ProblemData> {
  const { contestId, problemIndex, url } = parseCodeforcesUrl(problemUrl);
  const problemId = `${contestId}/${problemIndex}`;

  const cached = await prisma.problemCache.findUnique({
    where: { problemId },
  });

  if (!cached) {
    throw new Error(
      `Problem ${problemId} not found in cache. The sync job may not have run yet, or this problem may not exist.`
    );
  }

  return {
    html: cached.html,
    text: cached.text,
    title: cached.title,
    url: cached.url,
    problemId: cached.problemId,
  };
}

/**
 * Checks if a problem exists in the cache.
 */
export async function isProblemCached(problemUrl: string): Promise<boolean> {
  try {
    const { contestId, problemIndex } = parseCodeforcesUrl(problemUrl);
    const problemId = `${contestId}/${problemIndex}`;

    const cached = await prisma.problemCache.findUnique({
      where: { problemId },
      select: { id: true },
    });

    return cached !== null;
  } catch {
    return false;
  }
}

/**
 * Gets the total count of cached problems.
 */
export async function getCachedProblemCount(): Promise<number> {
  return prisma.problemCache.count();
}

/**
 * Searches for problems by title (partial match).
 */
export async function searchProblems(
  query: string,
  limit = 20
): Promise<{ problemId: string; title: string; url: string }[]> {
  const results = await prisma.problemCache.findMany({
    where: {
      title: {
        contains: query,
        mode: "insensitive",
      },
    },
    select: {
      problemId: true,
      title: true,
      url: true,
    },
    take: limit,
    orderBy: {
      problemId: "desc",
    },
  });

  return results;
}
