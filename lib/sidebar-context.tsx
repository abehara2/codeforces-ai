"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  chatCollapsed: boolean;
  setChatCollapsed: (collapsed: boolean) => void;
  toggleChatCollapsed: () => void;
  registerChatFocus: (focusFn: () => void) => void;
  focusChat: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const chatFocusRef = useRef<(() => void) | null>(null);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);
  const toggleChatCollapsed = () => setChatCollapsed((prev) => !prev);

  const registerChatFocus = useCallback((focusFn: () => void) => {
    chatFocusRef.current = focusFn;
  }, []);

  const focusChat = useCallback(() => {
    setChatCollapsed(false);
    // Small delay to ensure the chat panel is rendered before focusing
    setTimeout(() => {
      chatFocusRef.current?.();
    }, 0);
  }, []);

  // Cmd+B, Cmd+G, and Cmd+J keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        e.preventDefault();
        toggleChatCollapsed();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        focusChat();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusChat]);

  return (
    <SidebarContext.Provider value={{ 
      collapsed, 
      setCollapsed, 
      toggleCollapsed,
      chatCollapsed,
      setChatCollapsed,
      toggleChatCollapsed,
      registerChatFocus,
      focusChat
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
