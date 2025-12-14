import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// Router configuration
const MODELS = {
  information: "gpt-4.1-mini",
  implementation: "claude-opus-4-20250514",
} as const;

type RequestType = keyof typeof MODELS;

// Classify the user's request to route to the appropriate model
async function classifyRequest(
  openai: OpenAI,
  message: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<RequestType> {
  const classificationPrompt = `Classify the following user message as either "information" or "implementation".

- "information": Questions about algorithms, explanations, hints, problem understanding, complexity analysis, or conceptual discussions.
- "implementation": Requests to write code, fix bugs, modify code, optimize code, complete code, or any request that expects code as output.

Recent conversation context:
${conversationHistory.slice(-4).map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}

User message: "${message}"

Respond with exactly one word: either "information" or "implementation".`;

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content: classificationPrompt }],
    });

    const result = response.output_text?.toLowerCase().trim();
    
    if (result?.includes("implementation")) {
      return "implementation";
    }
    return "information";
  } catch (error) {
    console.error("Classification error, defaulting to implementation:", error);
    // Default to implementation model on error (more capable)
    return "implementation";
  }
}

// Tool definitions for Anthropic (used for implementation requests)
const anthropicTools: Anthropic.Tool[] = [
  {
    name: "modify_code",
    description:
      "Propose a modification to the user's code in the editor. Use this tool when the user asks you to write, modify, fix, or improve their code. The code will be shown to the user for confirmation before being applied. Always generate code in the language the user is currently using in their editor.",
    input_schema: {
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
    },
  },
  {
    name: "generate_inputs",
    description:
      "Generate test inputs for the problem. Use this tool when the user asks for test cases, sample inputs, edge cases, or stress tests. Generate inputs that follow the problem's input format exactly. This is useful for testing solutions against custom inputs, especially edge cases that aren't covered by the sample tests.",
    input_schema: {
      type: "object",
      properties: {
        inputs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              input: {
                type: "string",
                description: "The test input following the problem's input format exactly.",
              },
              description: {
                type: "string",
                description: "Brief description of what this test case is testing (e.g., 'minimum n', 'maximum values', 'all same elements').",
              },
            },
            required: ["input", "description"],
          },
          description: "Array of test inputs to generate.",
        },
      },
      required: ["inputs"],
    },
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

    // Get the user with subscription info
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is subscribed (has active subscription that hasn't expired)
    const isSubscribed = Boolean(
      user.stripeSubscriptionId &&
      user.stripeCurrentPeriodEnd &&
      user.stripeCurrentPeriodEnd.getTime() > Date.now()
    );

    // If not subscribed, check message limit
    if (!isSubscribed) {
      const assistantMessageCount = await prisma.message.count({
        where: {
          role: "assistant",
          chat: {
            userId: user.id,
          },
        },
      });

      const maxFreeMessages = parseInt(process.env.MAX_FREE_MESSAGES || "5", 10);
      if (assistantMessageCount >= maxFreeMessages) {
        return NextResponse.json(
          { error: "MESSAGE_LIMIT_REACHED" },
          { status: 403 }
        );
      }
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
    const systemPrompt = `You are an elite competitive programmer (Grandmaster level) helping solve Codeforces problems. You think and code like a top competitive programmer - prioritizing correctness, speed, and clean implementation.

Problem (HTML format):
${chat.problemHtml}
${codeContext}

APPROACH:
1. First, identify the problem type (greedy, DP, graphs, math, data structures, etc.)
2. Analyze constraints to determine required time complexity
3. Consider edge cases upfront (n=1, empty input, max values, overflow)
4. Choose the simplest correct approach that fits within time limits

IMPLEMENTATION STYLE:
- Write contest-style code: concise, efficient, no over-engineering
- Use standard competitive programming patterns and shortcuts
- Prefer simple array/vector over complex abstractions when possible
- Use fast I/O (ios_base::sync_with_stdio(false), cin.tie(nullptr) for C++)
- Handle integer overflow carefully (use long long when needed)
- Avoid floating point when possible; use integer math
- Keep variable names short but clear (n, m, dp, adj, etc.)

WHEN HELPING:
- Be direct and concise - skip unnecessary explanations
- Give complexity analysis (time and space)
- Point out common pitfalls and edge cases for this problem type
- If asked for hints, give progressive hints rather than full solutions
- When debugging, think about: off-by-one errors, overflow, uninitialized values, wrong data types

WHEN WRITING CODE:
- Use the modify_code tool to propose changes
- Generate code in ${currentLanguage || "the same language the user is using"}
- Write complete, submission-ready solutions
- Include all necessary includes/imports
- Test logic against sample cases mentally before proposing

IF USER ASKS FOR PSEUDOCODE:
- Write detailed pseudocode as comments outlining the full algorithm
- Include step-by-step logic with numbered steps and sub-steps
- Add TIME: O(...) and SPACE: O(...) complexity at the end
- Keep it clear enough that implementation follows directly from it

FORMATTING RESPONSES:
- Always format code snippets and examples using markdown code blocks with the appropriate language tag
- Use \`\`\`cpp for C++, \`\`\`python for Python, \`\`\`java for Java, etc.
- For inline code references like variable names or function names, use single backticks: \`variableName\`
- Use **bold** for emphasis on key concepts
- Use bullet points and numbered lists for step-by-step explanations
- Format mathematical expressions clearly (e.g., O(n log n), n × m, 2^n)
- When showing algorithm steps or complexity analysis, use clear formatting with headers if needed`;

    const openai = getOpenAIClient();

    // Route request to appropriate model
    const requestType = await classifyRequest(openai, message, conversationHistory);
    const selectedModel = MODELS[requestType];
    
    console.log(`[Router] Classified as "${requestType}" → using ${selectedModel}`);

    // Create a streaming response
    const encoder = new TextEncoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (requestType === "implementation") {
            // Use Anthropic for implementation requests
            const anthropic = getAnthropicClient();
            
            // Convert conversation history to Anthropic format
            const anthropicMessages: Anthropic.MessageParam[] = conversationHistory.map((msg) => ({
              role: msg.role,
              content: msg.content,
            }));
            anthropicMessages.push({ role: "user", content: message });

            const response = await anthropic.messages.create({
              model: selectedModel,
              max_tokens: 16384,
              system: systemPrompt,
              messages: anthropicMessages,
              tools: anthropicTools,
              stream: true,
            });

            let currentToolName = "";
            let currentToolInput = "";

            for await (const event of response) {
              if (event.type === "content_block_start") {
                if (event.content_block.type === "tool_use") {
                  currentToolName = event.content_block.name;
                  currentToolInput = "";
                }
              } else if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  const text = event.delta.text;
                  fullContent += text;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                  );
                } else if (event.delta.type === "input_json_delta") {
                  currentToolInput += event.delta.partial_json;
                }
              } else if (event.type === "content_block_stop") {
                if (currentToolName === "modify_code" && currentToolInput) {
                  try {
                    const args = JSON.parse(currentToolInput);
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
                    fullContent += `\n\n[Proposed code modification: ${args.description}]`;
                  } catch (e) {
                    console.error("Failed to parse tool call arguments:", e);
                  }
                  currentToolName = "";
                  currentToolInput = "";
                } else if (currentToolName === "generate_inputs" && currentToolInput) {
                  try {
                    const args = JSON.parse(currentToolInput);
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          toolCall: {
                            name: "generate_inputs",
                            inputs: args.inputs,
                          },
                        })}\n\n`
                      )
                    );
                    const inputDescriptions = args.inputs.map((i: { description: string }) => i.description).join(", ");
                    fullContent += `\n\n[Generated test inputs: ${inputDescriptions}]`;
                  } catch (e) {
                    console.error("Failed to parse generate_inputs arguments:", e);
                  }
                  currentToolName = "";
                  currentToolInput = "";
                }
              }
            }
          } else {
            // Use OpenAI for information requests
            const response = await openai.responses.create({
              model: selectedModel,
              input: [
                { role: "system", content: systemPrompt },
                ...conversationHistory,
                { role: "user", content: message },
              ],
              stream: true,
            });

            for await (const event of response) {
              if (event.type === "response.output_text.delta") {
                const text = event.delta;
                fullContent += text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
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
