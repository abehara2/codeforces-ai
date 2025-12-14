"use client";

import { useState } from "react";
import { Code2, FileText, ExternalLink } from "lucide-react";
import { CodeEditor } from "@/components/code-editor";
import { ProblemStatement } from "@/components/problem-statement";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MainContentProps {
  problemId: string;
  problemHtml: string;
}

export function MainContent({ problemId, problemHtml }: MainContentProps) {
  const [activeTab, setActiveTab] = useState<"code" | "problem">("problem");

  const hasProblem = Boolean(problemId);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header with Tabs */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-white">
        <div className="flex items-center gap-1">
          {/* Tabs */}
          <button
            onClick={() => setActiveTab("problem")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              activeTab === "problem"
                ? "bg-black text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FileText className="h-4 w-4" />
            PROBLEM
          </button>
          {hasProblem && (
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              activeTab === "code"
                ? "bg-black text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Code2 className="h-4 w-4" />
            CODE
          </button>
          )}
          
        </div>

        {/* Problem ID Link */}
        {hasProblem && (
        <a
          href={`https://codeforces.com/problemset/problem/${problemId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-mono text-black hover:underline"
        >
          {problemId}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        )}
      </header>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {activeTab === "code" && hasProblem ? (
          <CodeEditor />
        ) : (
          <ScrollArea className="h-full">
            {hasProblem && (
              <h1 className="text-2xl font-bold px-4 pt-4">
                {problemId.split("/")[0]}
              </h1>
            )}
            <ProblemStatement html={problemHtml} />
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
