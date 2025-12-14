"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCodeforcesProblemClient } from "@/lib/codeforces-client";

export function NewProblemPrompt() {
  const [problemUrl, setProblemUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemUrl.trim()) return;

    setLoading(true);
    setError("");
    setStatus("Fetching problem from Codeforces...");

    try {
      // Fetch problem client-side (bypasses CORS/bot detection)
      const problemData = await fetchCodeforcesProblemClient(problemUrl.trim());
      
      setStatus("Creating chat...");

      // Send to API with already-fetched data
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problemData.problemId,
          problemHtml: problemData.html,
          problemCssUrls: problemData.cssUrls,
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
      setStatus("");
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-[#fafafa]">
      <div className="max-w-xl w-full mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-6">
            <Code2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">START SOLVING</h1>
          <p className="text-muted-foreground text-sm">
            Paste a Codeforces problem link to begin
          </p>
        </div>

        <form onSubmit={handleCreateChat} className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="https://codeforces.com/problemset/problem/2176/D"
              value={problemUrl}
              onChange={(e) => setProblemUrl(e.target.value)}
              className="font-mono flex-1 text-sm"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !problemUrl.trim()} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  GO <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {status && (
            <p className="text-sm text-muted-foreground text-center">{status}</p>
          )}
          
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Supports problemset, contest, and gym URLs
          </p>
        </form>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-4">
            OR CLICK THE BUTTON IN THE SIDEBAR
          </p>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/chat/new")}>
              <Plus className="h-4 w-4" />
              NEW PROBLEM
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
