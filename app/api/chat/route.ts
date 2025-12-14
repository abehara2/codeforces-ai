import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Tool definitions for the AI agent
const tools: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "modify_code",
    description:
      "Propose a modification to the user's code in the editor. Use this tool when the user asks you to write, modify, fix, or improve their code. The code will be shown to the user for confirmation before being applied. Always generate code in the language the user is currently using in their editor.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "The complete new code to replace the current code in the editor. This should be the full code, not a diff or partial code.",
        },
        description: {
          type: "string",
          description:
            "A brief description of what changes were made to the code (1-2 sentences).",
        },
      },
      required: ["code", "description"],
      additionalProperties: false,
    },
    strict: true,
  },
];

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, message, currentCode, currentLanguage } = await request.json();

    if (!chatId || !message) {
      return NextResponse.json(
        { error: "Chat ID and message are required" },
        { status: 400 }
      );
    }

    // Get the chat with problem context
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Save user message
    await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content: message,
      },
    });

    // Build conversation history
    const conversationHistory = chat.messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Build context about the current code
    const codeContext = currentCode
      ? `\n\nThe user's current code in the editor (${currentLanguage || "unknown language"}):\n\`\`\`\n${currentCode}\n\`\`\``
      : "\n\nThe user hasn't written any code yet.";

    // Create system prompt with problem context
    const systemPrompt = `You are an expert competitive programming assistant helping solve Codeforces problems. You have deep knowledge of algorithms, data structures, and problem-solving techniques.

Here is the problem the user is working on (in HTML format):

${chat.problemHtml}
${codeContext}

Guidelines:
- Help the user understand the problem and develop a solution
- Explain algorithms and approaches clearly
- When the user asks you to write, modify, fix, or improve code, use the modify_code tool to propose changes
- IMPORTANT: When using modify_code, always generate code in ${currentLanguage || "the same language the user is using"}
- Point out edge cases and potential issues
- Be encouraging but honest about complexity and difficulty
- If the user shares code in the chat, help debug and optimize it
- Use proper mathematical notation when explaining concepts
- When providing code solutions, prefer complete working solutions over partial snippets`;

    const openai = getOpenAIClient();

    // Call OpenAI API with streaming and tools
    const response = await openai.responses.create({
      model: "gpt-4.1-2025-04-14",
      input: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ],
      tools,
      stream: true,
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    let fullContent = "";
    let currentToolCall: { name: string; arguments: string } | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of response) {
            if (event.type === "response.output_text.delta") {
              const text = event.delta;
              fullContent += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            } else if (event.type === "response.function_call_arguments.delta") {
              // Accumulate function arguments
              if (currentToolCall) {
                currentToolCall.arguments += event.delta;
              }
            } else if (event.type === "response.output_item.added") {
              // Check if it's a function call
              if (event.item.type === "function_call") {
                currentToolCall = {
                  name: event.item.name,
                  arguments: "",
                };
              }
            } else if (event.type === "response.output_item.done") {
              // Function call is complete
              if (event.item.type === "function_call" && currentToolCall) {
                try {
                  const args = JSON.parse(currentToolCall.arguments);
                  if (currentToolCall.name === "modify_code") {
                    // Send tool call to client
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          toolCall: {
                            name: "modify_code",
                            code: args.code,
                            description: args.description,
                          },
                        })}\n\n`
                      )
                    );
                    // Add to full content for saving
                    fullContent += `\n\n[Proposed code modification: ${args.description}]`;
                  }
                } catch (e) {
                  console.error("Failed to parse tool call arguments:", e);
                }
                currentToolCall = null;
              }
            }
          }

          // Save assistant message after streaming completes
          await prisma.message.create({
            data: {
              chatId,
              role: "assistant",
              content: fullContent,
            },
          });

          // Update chat's updatedAt
          await prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
