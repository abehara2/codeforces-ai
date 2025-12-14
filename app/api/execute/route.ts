import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Judge0 language IDs mapped to Codeforces language names
export const CODEFORCES_LANGUAGES = [
  { id: 54, name: "C++ 17 (GCC 9-64)", extension: "cpp" },
  { id: 52, name: "C++ 17 (GCC 7-32)", extension: "cpp" },
  { id: 50, name: "C (GCC 9.2.0)", extension: "c" },
  { id: 62, name: "Java 11", extension: "java" },
  { id: 71, name: "Python 3", extension: "py" },
  { id: 70, name: "Python 2", extension: "py" },
  { id: 72, name: "Ruby", extension: "rb" },
  { id: 51, name: "C# (.NET Core)", extension: "cs" },
  { id: 60, name: "Go", extension: "go" },
  { id: 73, name: "Rust", extension: "rs" },
  { id: 74, name: "TypeScript", extension: "ts" },
  { id: 63, name: "JavaScript (Node.js)", extension: "js" },
  { id: 78, name: "Kotlin", extension: "kt" },
  { id: 68, name: "PHP", extension: "php" },
  { id: 83, name: "Swift", extension: "swift" },
  { id: 64, name: "Lua", extension: "lua" },
  { id: 85, name: "Perl", extension: "pl" },
  { id: 80, name: "R", extension: "r" },
  { id: 81, name: "Scala", extension: "scala" },
  { id: 61, name: "Haskell", extension: "hs" },
];

export async function GET() {
  return NextResponse.json({ languages: CODEFORCES_LANGUAGES });
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, languageId, stdin } = await request.json();

    if (!code || !languageId) {
      return NextResponse.json(
        { error: "Code and language ID are required" },
        { status: 400 }
      );
    }

    const JUDGE0_API_URL = process.env.JUDGE0_API_URL;
    const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

    if (!JUDGE0_API_URL || !JUDGE0_API_KEY) {
      return NextResponse.json(
        { error: "Judge0 API not configured" },
        { status: 500 }
      );
    }

    // Submit code to Judge0
    const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        source_code: Buffer.from(code).toString("base64"),
        language_id: languageId,
        stdin: stdin ? Buffer.from(stdin).toString("base64") : "",
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("Judge0 error:", errorText);
      return NextResponse.json(
        { error: "Failed to execute code" },
        { status: 500 }
      );
    }

    const result = await submitResponse.json();

    // Decode base64 outputs
    const decodeBase64 = (str: string | null) => {
      if (!str) return null;
      try {
        return Buffer.from(str, "base64").toString("utf-8");
      } catch {
        return str;
      }
    };

    return NextResponse.json({
      stdout: decodeBase64(result.stdout),
      stderr: decodeBase64(result.stderr),
      compile_output: decodeBase64(result.compile_output),
      message: result.message,
      status: result.status,
      time: result.time,
      memory: result.memory,
    });
  } catch (error) {
    console.error("Error executing code:", error);
    return NextResponse.json(
      { error: "Failed to execute code" },
      { status: 500 }
    );
  }
}

