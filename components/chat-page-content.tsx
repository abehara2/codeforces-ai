"use client";

import { useMemo } from "react";
import { MainContent } from "@/components/main-content";
import { ChatPanel } from "@/components/chat-panel";
import { CodeEditorProvider, SampleTest } from "@/lib/code-editor-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatPageContentProps {
  chatId: string;
  problemId: string;
  problemHtml: string;
  messages: Message[];
  codeByLanguage: Record<string, string>;
}

// Extract text from a pre element, handling test-example-line divs
function extractPreText(pre: Element): string {
  const lineElements = pre.querySelectorAll('[class*="test-example-line-"]');
  if (lineElements.length > 0) {
    return Array.from(lineElements)
      .map(el => el.textContent || "")
      .join("\n")
      .trim();
  }
  return pre.textContent?.trim() || "";
}

// Extract all sample tests (input + expected output pairs) from problem HTML
function extractSampleTests(html: string): SampleTest[] {
  if (typeof document === "undefined") return [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tests: SampleTest[] = [];
  
  // Try to find sample-test elements (each contains one input/output pair)
  const sampleTestElements = doc.querySelectorAll(".sample-test");
  
  if (sampleTestElements.length > 0) {
    sampleTestElements.forEach((testEl) => {
      const inputPre = testEl.querySelector(".input pre");
      const outputPre = testEl.querySelector(".output pre");
      
      if (inputPre && outputPre) {
        tests.push({
          input: extractPreText(inputPre),
          expectedOutput: extractPreText(outputPre),
        });
      }
    });
  }
  
  // Alternative: try table-based format
  if (tests.length === 0) {
    const rows = doc.querySelectorAll(".sample-tests table tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const inputPre = cells[0].querySelector("pre");
        const outputPre = cells[1].querySelector("pre");
        if (inputPre && outputPre) {
          tests.push({
            input: extractPreText(inputPre),
            expectedOutput: extractPreText(outputPre),
          });
        }
      }
    });
  }
  
  return tests;
}

export function ChatPageContent({
  chatId,
  problemId,
  problemHtml,
  messages,
  codeByLanguage,
}: ChatPageContentProps) {
  // Extract sample tests from problem HTML
  const sampleTests = useMemo(() => extractSampleTests(problemHtml), [problemHtml]);

  return (
    <CodeEditorProvider chatId={chatId} initialCodeByLanguage={codeByLanguage} initialSampleTests={sampleTests}>
      {/* Main Content with Tabs */}
      <MainContent problemId={problemId} problemHtml={problemHtml} />

      {/* Right Sidebar - Chat */}
      <ChatPanel chatId={chatId} initialMessages={messages} />
    </CodeEditorProvider>
  );
}
