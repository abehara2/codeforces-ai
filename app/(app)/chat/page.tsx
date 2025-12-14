import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

  // Has chats - redirect to the most recent one
  if (hasChats && user.chats[0]) {
    redirect(`/chat/${user.chats[0].id}`);
  }

  // No chats - show welcome screen
  return (
    <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
      <WelcomeScreen />
    </div>
  );
}
