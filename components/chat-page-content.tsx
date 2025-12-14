"use client";

import { ChatSidebar } from "@/components/chat-sidebar";
import { MainContent } from "@/components/main-content";
import { ChatPanel } from "@/components/chat-panel";
import { CodeEditorProvider } from "@/lib/code-editor-context";

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
}

export function ChatPageContent({
  chatId,
  problemId,
  problemHtml,
  messages,
}: ChatPageContentProps) {
  return (
    <CodeEditorProvider>
      <div className="h-screen flex overflow-hidden">
        {/* Left Sidebar - Chat List */}
        <ChatSidebar />

        {/* Main Content with Tabs */}
        <MainContent problemId={problemId} problemHtml={problemHtml} />

        {/* Right Sidebar - Chat */}
        <ChatPanel chatId={chatId} initialMessages={messages} />
      </div>
    </CodeEditorProvider>
  );
}
