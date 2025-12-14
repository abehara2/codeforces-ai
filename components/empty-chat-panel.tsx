"use client";

import { Bot, MessageSquarePlus } from "lucide-react";

interface EmptyChatPanelProps {
  hasChats: boolean;
}

export function EmptyChatPanel({ hasChats }: EmptyChatPanelProps) {
  return (
    <div className="w-96 h-full flex flex-col border-l border-border bg-white">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-bold">AI ASSISTANT</h2>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          {hasChats ? (
            <>
              <MessageSquarePlus className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium mb-2">SELECT A PROBLEM</p>
              <p className="text-xs">
                Choose a problem from the sidebar to start chatting with the AI assistant.
              </p>
            </>
          ) : (
            <>
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium mb-2">NO PROBLEMS YET</p>
              <p className="text-xs">
                Create your first problem to start getting AI assistance with competitive programming.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

