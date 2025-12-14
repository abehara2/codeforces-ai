/**
 * DANGER: This script deletes ALL data from:
 * - Prisma database (all tables)
 * - Clerk (all users)
 * - Stripe (all customers & subscriptions)
 *
 * Run with: npx dotenv -e .env.local -- tsx scripts/clean-all.ts
 */

import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;

// Clerk API helper
async function clerkFetch(endpoint: string, method: string = "GET") {
  const response = await fetch(`https://api.clerk.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Clerk API error: ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

async function cleanPrisma() {
  console.log("\n🗄️  Cleaning Prisma database...");

  // Delete in order to respect foreign key constraints
  const messages = await prisma.message.deleteMany();
  console.log(`   Deleted ${messages.count} messages`);

  const chats = await prisma.chat.deleteMany();
  console.log(`   Deleted ${chats.count} chats`);

  const users = await prisma.user.deleteMany();
  console.log(`   Deleted ${users.count} users`);

  // Also clean the problem cache
  const problemCache = await prisma.problemCache.deleteMany();
  console.log(`   Deleted ${problemCache.count} cached problems`);

  console.log("   ✅ Prisma database cleaned");
}

async function cleanClerk() {
  console.log("\n👤 Cleaning Clerk users...");

  let deletedCount = 0;
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const response = await clerkFetch(`/users?limit=100&offset=${offset}`);
    const users = response as { id: string }[];

    if (!users || users.length === 0) {
      hasMore = false;
      break;
    }

    for (const user of users) {
      await clerkFetch(`/users/${user.id}`, "DELETE");
      deletedCount++;
      process.stdout.write(`   Deleted ${deletedCount} users\r`);
    }

    // Don't increment offset since we're deleting users
    // The next batch will be the "new" first 100
    if (users.length < 100) {
      hasMore = false;
    }
  }

  console.log(`   Deleted ${deletedCount} users total`);
  console.log("   ✅ Clerk users cleaned");
}

async function cleanStripe() {
  console.log("\n💳 Cleaning Stripe...");

  // First, cancel all active subscriptions
  let subscriptionCount = 0;
  let hasMoreSubs = true;
  let subStartingAfter: string | undefined;

  while (hasMoreSubs) {
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      starting_after: subStartingAfter,
    });

    for (const subscription of subscriptions.data) {
      await stripe.subscriptions.cancel(subscription.id);
      subscriptionCount++;
      process.stdout.write(`   Canceled ${subscriptionCount} subscriptions\r`);
    }

    hasMoreSubs = subscriptions.has_more;
    if (subscriptions.data.length > 0) {
      subStartingAfter = subscriptions.data[subscriptions.data.length - 1].id;
    }
  }
  console.log(`   Canceled ${subscriptionCount} subscriptions total`);

  // Then delete all customers
  let customerCount = 0;
  let hasMoreCustomers = true;
  let custStartingAfter: string | undefined;

  while (hasMoreCustomers) {
    const customers = await stripe.customers.list({
      limit: 100,
      starting_after: custStartingAfter,
    });

    for (const customer of customers.data) {
      await stripe.customers.del(customer.id);
      customerCount++;
      process.stdout.write(`   Deleted ${customerCount} customers\r`);
    }

    hasMoreCustomers = customers.has_more;
    if (customers.data.length > 0) {
      custStartingAfter = customers.data[customers.data.length - 1].id;
    }
  }
  console.log(`   Deleted ${customerCount} customers total`);

  console.log("   ✅ Stripe cleaned");
}

async function main() {
  console.log("⚠️  WARNING: This will delete ALL data!");
  console.log("   Press Ctrl+C within 5 seconds to cancel...\n");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("🚀 Starting cleanup...");

  try {
    await cleanPrisma();
    await cleanClerk();
    await cleanStripe();

    console.log("\n✅ All done! Everything has been cleaned.");
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
