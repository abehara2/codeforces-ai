"use client";

import { ChatSidebar } from "@/components/chat-sidebar";
import { SidebarProvider } from "@/lib/sidebar-context";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="h-screen flex overflow-hidden">
        <ChatSidebar />
        {children}
      </div>
    </SidebarProvider>
  );
}
