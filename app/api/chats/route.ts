import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        chats: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            problemId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ chats: [] });
    }

    // Get titles from ProblemCache
    const problemIds = user.chats.map((chat) => chat.problemId);
    const problemCaches = await prisma.problemCache.findMany({
      where: { problemId: { in: problemIds } },
      select: { problemId: true, title: true },
    });

    const titleMap = new Map(
      problemCaches.map((p) => [p.problemId, p.title])
    );

    const chatsWithTitles = user.chats.map((chat) => ({
      ...chat,
      title: titleMap.get(chat.problemId) || chat.problemId,
    }));

    return NextResponse.json({ chats: chatsWithTitles });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { problemId, problemHtml } = body;

    // Expect client to send already-fetched problem data
    if (!problemId || !problemHtml) {
      return NextResponse.json(
        { error: "Problem ID and HTML are required" },
        { status: 400 }
      );
    }

    // Find or create user
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;
    
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { email },
      create: { clerkId, email },
    });

    // Create chat
    const chat = await prisma.chat.create({
      data: {
        userId: user.id,
        problemId,
        problemHtml,
      },
    });

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
