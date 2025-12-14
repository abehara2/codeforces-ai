"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, User, Code2, Check, X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown, defaultRehypePlugins } from "streamdown";
import { useCodeEditor } from "@/lib/code-editor-context";

// Exclude rehype-raw to prevent C++ includes like <iostream> from being parsed as HTML
const rehypePlugins = [
  defaultRehypePlugins.katex,
  defaultRehypePlugins.harden,
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  codeChange?: {
    description: string;
    applied: boolean | null; // null = pending/reviewing, true = accepted, false = rejected
  };
}

interface ChatPanelProps {
  chatId: string;
  initialMessages: Message[];
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 384;

export function ChatPanel({ chatId, initialMessages }: ChatPanelProps) {
  const { code, selectedLanguage, setPendingChange, pendingChange, lastChangeResult } = useCodeEditor();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastToolCallMessageId = useRef<string | null>(null);
  const router = useRouter();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const windowWidth = window.innerWidth;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, windowWidth - e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, isStreaming]);

  // Update message status when pending change is accepted or rejected
  useEffect(() => {
    if (lastChangeResult && lastToolCallMessageId.current) {
      const messageId = lastToolCallMessageId.current;
      const wasAccepted = lastChangeResult === "accepted";
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId && m.codeChange && m.codeChange.applied === null) {
            return { ...m, codeChange: { ...m.codeChange, applied: wasAccepted } };
          }
          return m;
        })
      );
      lastToolCallMessageId.current = null;
    }
  }, [lastChangeResult]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Add user message immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          message: userMessage,
          currentCode: code,
          currentLanguage: selectedLanguage?.name || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === "MESSAGE_LIMIT_REACHED") {
          setLimitReached(true);
          // Remove the temp user message we just added
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
          return;
        }
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let receivedToolCall: { code: string; description: string } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              const messageId = `assistant-${Date.now()}`;
              
              // Add assistant message
              const assistantMessage: Message = {
                id: messageId,
                role: "assistant",
                content: fullContent,
                createdAt: new Date().toISOString(),
                codeChange: receivedToolCall
                  ? {
                      description: receivedToolCall.description,
                      applied: null, // null = currently reviewing in diff view
                    }
                  : undefined,
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingContent("");

              // If there's a tool call, set the pending change to show diff view
              if (receivedToolCall) {
                lastToolCallMessageId.current = messageId;
                setPendingChange({
                  code: receivedToolCall.code,
                  description: receivedToolCall.description,
                });
              }
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullContent += parsed.text;
                  setStreamingContent(fullContent);
                }
                if (parsed.toolCall) {
                  receivedToolCall = {
                    code: parsed.toolCall.code,
                    description: parsed.toolCall.description,
                  };
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, there was an error processing your message. Please try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      ref={panelRef}
      style={{ width }}
      className="h-full flex flex-col border-l border-border bg-white relative"
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
          isDragging ? "bg-primary/30" : ""
        }`}
      />

      {/* Header */}
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-bold">AI ASSISTANT</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !streamingContent && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Ask me anything about the problem!</p>
              <p className="text-xs mt-1">
                I can help with approaches, debugging, and optimization.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className="flex gap-3 items-start"
            >
              <div
                className={`w-6 h-6 flex items-center justify-center flex-shrink-0 ${
                  message.role === "assistant"
                    ? "bg-black text-white"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-1">
                  {message.role === "assistant" ? "AI" : "YOU"}
                </p>
                <div className="text-sm prose prose-sm max-w-none break-words">
                  {message.role === "assistant" ? (
                    <Streamdown rehypePlugins={rehypePlugins}>{message.content}</Streamdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                {/* Code change indicator */}
                {message.codeChange && (
                  <div className={`mt-2 flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md ${
                    message.codeChange.applied === null
                      ? "bg-violet-50 text-violet-700 border border-violet-200"
                      : message.codeChange.applied
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {message.codeChange.applied === null ? (
                      <>
                        <Code2 className="h-3.5 w-3.5" />
                        <span>Review changes in editor</span>
                      </>
                    ) : message.codeChange.applied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Changes applied</span>
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" />
                        <span>Changes rejected</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isStreaming && !streamingContent && (
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-black text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-1">AI</p>
                <p className="text-sm text-muted-foreground animate-pulse">
                  Thinking...
                </p>
              </div>
            </div>
          )}

          {streamingContent && (
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-black text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-1">AI</p>
                <div className="text-sm prose prose-sm max-w-none break-words">
                  <Streamdown isAnimating rehypePlugins={rehypePlugins}>{streamingContent}</Streamdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input or Upgrade Prompt */}
      {limitReached ? (
        <div className="p-4 border-t border-border bg-purple-50">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-purple-900 mb-1">
              Message limit reached
            </p>
            <p className="text-xs text-purple-700 mb-3">
              Please upgrade your account to send more messages
            </p>
            <Button
              onClick={() => router.push("/billing")}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the problem..."
              className="min-h-[60px] max-h-[120px] resize-none text-sm"
              disabled={isStreaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="self-end"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
