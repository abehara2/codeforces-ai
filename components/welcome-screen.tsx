"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCodeforcesProblemClient, parseCodeforcesUrl } from "@/lib/codeforces-client";

export function WelcomeScreen() {
  const [problemUrl, setProblemUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Real-time URL validation
  const urlValidation = useMemo(() => {
    if (!problemUrl.trim()) {
      return { valid: false, problemId: null };
    }
    try {
      const parsed = parseCodeforcesUrl(problemUrl);
      return { 
        valid: true, 
        problemId: `${parsed.contestId}/${parsed.problemIndex}`
      };
    } catch {
      return { valid: false, problemId: null };
    }
  }, [problemUrl]);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemUrl.trim() || !urlValidation.valid) return;

    setLoading(true);
    setError("");

    try {
      const problemData = await fetchCodeforcesProblemClient(problemUrl.trim());

      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problemData.problemId,
          problemHtml: problemData.html,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create chat");
      }

      const chat = await response.json();
      router.push(`/chat/${chat.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto px-4">
      <form onSubmit={handleCreateChat} className="space-y-3">
        <h1 className="text-lg font-bold">Paste a Codeforces URL</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="https://codeforces.com/problemset/problem/1234/A"
              value={problemUrl}
              onChange={(e) => setProblemUrl(e.target.value)}
              className={`font-mono text-sm pr-10 ${
                problemUrl.trim() 
                  ? urlValidation.valid 
                    ? "border-green-500 focus-visible:ring-green-500" 
                    : "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
              disabled={loading}
            />
            {problemUrl.trim() && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {urlValidation.valid ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </div>
            )}
          </div>
          <Button type="submit" disabled={loading || !urlValidation.valid} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                GO <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </form>
    </div>
  );
}
