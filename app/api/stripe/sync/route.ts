import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({ 
        error: "No Stripe customer ID found",
        synced: false 
      }, { status: 400 });
    }

    // Fetch all subscriptions for this customer from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      // current_period_end may be on subscription or on items depending on API version
      const periodEnd = subscription.current_period_end ?? 
        (subscription.items.data[0] as { current_period_end?: number })?.current_period_end;
      const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id,
          stripeCurrentPeriodEnd: currentPeriodEnd,
        },
      });

      return NextResponse.json({
        synced: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd,
        },
      });
    } else {
      // No active subscription found, clear the fields
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
        },
      });

      return NextResponse.json({
        synced: true,
        subscription: null,
      });
    }
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
