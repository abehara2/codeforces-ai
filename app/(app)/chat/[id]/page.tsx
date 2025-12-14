import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatPageContent } from "@/components/chat-page-content";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/");
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    redirect("/chat/new");
  }

  const chat = await prisma.chat.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!chat) {
    redirect("/chat/new");
  }

  const messages = chat.messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <ChatPageContent
      chatId={chat.id}
      problemId={chat.problemId}
      problemHtml={chat.problemHtml}
      messages={messages}
    />
  );
}

