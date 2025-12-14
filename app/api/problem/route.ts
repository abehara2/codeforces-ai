import { NextResponse } from "next/server";
import { fetchCodeforcesProblem } from "@/lib/codeforces";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const problemUrl = searchParams.get("url");

    if (!problemUrl) {
      return NextResponse.json(
        { error: "Problem URL is required" },
        { status: 400 }
      );
    }

    const problemData = await fetchCodeforcesProblem(problemUrl);
    return NextResponse.json(problemData);
  } catch (error) {
    console.error("Error fetching problem:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch problem from Codeforces";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
