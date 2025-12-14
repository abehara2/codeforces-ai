import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Helper to get current_period_end from subscription (may be on items in newer API versions)
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end ??
    (subscription.items.data[0] as unknown as { current_period_end?: number })?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000) : null;
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe Webhook] Checkout session completed:`, {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          mode: session.mode,
          metadata: session.metadata,
        });

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const customerId = session.customer as string;

          // First try to find user by stripeCustomerId
          let user = await prisma.user.findUnique({
            where: { stripeCustomerId: customerId },
          });
          console.log(`[Stripe Webhook] User by stripeCustomerId:`, user?.id || "not found");

          // If not found, try by clerkId from metadata
          if (!user && session.metadata?.clerkId) {
            user = await prisma.user.findUnique({
              where: { clerkId: session.metadata.clerkId },
            });
            console.log(`[Stripe Webhook] User by clerkId:`, user?.id || "not found");
          }

          // If still not found, look up by email
          if (!user) {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && customer.email) {
              console.log(`[Stripe Webhook] Looking up user by email:`, customer.email);
              user = await prisma.user.findUnique({
                where: { email: customer.email },
              });
              console.log(`[Stripe Webhook] User by email:`, user?.id || "not found");
            }
          }

          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscription.id,
                stripePriceId: subscription.items.data[0]?.price.id,
                stripeCurrentPeriodEnd: getSubscriptionPeriodEnd(subscription),
              },
            });
            console.log(`[Stripe Webhook] Updated user ${user.id} with subscription ${subscription.id}`);
          } else {
            console.error("[Stripe Webhook] No user found for checkout session:", session.id);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription;

        if (subscriptionId) {
          const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
          const subscription = await stripe.subscriptions.retrieve(subId);

          await prisma.user.update({
            where: { stripeCustomerId: invoice.customer as string },
            data: {
              stripePriceId: subscription.items.data[0]?.price.id,
              stripeCurrentPeriodEnd: getSubscriptionPeriodEnd(subscription),
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.user.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            stripePriceId: subscription.items.data[0]?.price.id,
            stripeCurrentPeriodEnd: getSubscriptionPeriodEnd(subscription),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.user.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
