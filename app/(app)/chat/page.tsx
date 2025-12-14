import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CodeEditor } from "@/components/code-editor";
import { EmptyChatPanel } from "@/components/empty-chat-panel";
import { WelcomeScreen } from "@/components/welcome-screen";

export default async function ChatPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/");
  }

  // Check if user has any chats
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      chats: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  const hasChats = !!(user && user.chats.length > 0);

  // No chats - show welcome screen without AI panel
  if (!hasChats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
        <WelcomeScreen />
      </div>
    );
  }

  // Has chats - show full layout
  return (
    <>
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
    </>
  );
}
