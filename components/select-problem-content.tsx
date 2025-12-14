"use client";

import { CodeEditor } from "@/components/code-editor";
import { EmptyChatPanel } from "@/components/empty-chat-panel";
import { CodeEditorProvider } from "@/lib/code-editor-context";

export function SelectProblemContent() {
  return (
    <CodeEditorProvider>
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">SELECT A PROBLEM</span>
          </div>
        </header>

        {/* Main Area */}
        <div className="flex-1 min-h-0">
          <CodeEditor />
        </div>
      </div>

      {/* Right Sidebar - Chat */}
      <EmptyChatPanel hasChats={true} />
    </CodeEditorProvider>
  );
}
