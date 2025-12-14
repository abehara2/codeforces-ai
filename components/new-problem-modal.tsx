"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchCodeforcesProblemClient, parseCodeforcesUrl } from "@/lib/codeforces-client";

interface NewProblemModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewProblemModal({ trigger, open, onOpenChange }: NewProblemModalProps) {
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
      setProblemUrl("");
      onOpenChange?.(false);
      router.push(`/chat/${chat.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chat");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <form onSubmit={handleCreateChat} className="space-y-4">
      <h2 className="text-lg font-bold">Paste a Codeforces URL</h2>
      <div className="relative">
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
          autoFocus
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button 
        type="submit" 
        className="w-full gap-2" 
        disabled={loading || !urlValidation.valid}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            GO <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );

  // If controlled externally
  if (open !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // Self-contained with trigger
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            NEW PROBLEM
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        {content}
      </DialogContent>
    </Dialog>
  );
}
