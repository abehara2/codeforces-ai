import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const PLANS = {
  pro: {
    name: "Pro",
    description: "Unlimited access to AI-powered Codeforces assistance",
    price: 20,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
};
