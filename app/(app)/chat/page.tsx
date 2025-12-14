import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SelectProblemContent } from "@/components/select-problem-content";
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

  // Has chats - show full layout with CodeEditorProvider
  return <SelectProblemContent />;
}
