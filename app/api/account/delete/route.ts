import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const { userId: clerkId } = await auth();
    const user = await currentUser();

    if (!clerkId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    // Delete Stripe subscription and customer if exists
    if (dbUser?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(dbUser.stripeSubscriptionId);
      } catch (error) {
        console.error("Error canceling Stripe subscription:", error);
      }
    }

    if (dbUser?.stripeCustomerId) {
      try {
        await stripe.customers.del(dbUser.stripeCustomerId);
      } catch (error) {
        console.error("Error deleting Stripe customer:", error);
      }
    }

    // Delete user from database (cascades to chats and messages)
    if (dbUser) {
      await prisma.user.delete({
        where: { id: dbUser.id },
      });
    }

    // Delete user from Clerk
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
