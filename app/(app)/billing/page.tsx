"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Subscription {
  priceId: string;
  currentPeriodEnd: string;
}

export default function BillingPage() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const searchParams = useSearchParams();

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    // If returning from successful checkout, sync subscription first
    if (success) {
      syncSubscription().then(() => fetchSubscription());
    } else {
      fetchSubscription();
    }
  }, [success]);

  const syncSubscription = async () => {
    try {
      await fetch("/api/stripe/sync", { method: "POST" });
    } catch (error) {
      console.error("Failed to sync subscription:", error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/subscription");
      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.isSubscribed);
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout failed:", data.error);
        setCheckoutLoading(false);
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal access failed:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to chat
        </Link>

        <h1 className="text-2xl font-bold mb-2">Billing</h1>
        <p className="text-muted-foreground mb-8">
          Manage your subscription and billing details.
        </p>

        {canceled && (
          <div className="mb-6 p-4 border border-yellow-500 bg-yellow-500/10 text-yellow-700">
            <p className="font-medium">Payment canceled</p>
            <p className="text-sm">
              Your payment was canceled. You can try again anytime.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isSubscribed ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pro Plan</CardTitle>
                  <CardDescription>$20/month</CardDescription>
                </div>
                <div className="px-3 py-1 text-xs font-medium bg-green-500/10 text-green-700 border border-green-500">
                  Active
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Renews on{" "}
                    {subscription?.currentPeriodEnd
                      ? formatDate(subscription.currentPeriodEnd)
                      : "—"}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Plan includes:</p>
                  <ul className="space-y-2">
                    {[
                      "Unlimited AI conversations",
                      "Access to all Codeforces problems",
                      "Code execution & testing",
                      "Solution explanations & hints",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                disabled
                className="w-full bg-green-600 hover:bg-green-600 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Subscribed
              </Button>
              <Button
                variant="ghost"
                onClick={handlePortal}
                disabled={portalLoading}
                className="w-full text-muted-foreground"
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Manage Subscription"
                )}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Pro Plan</CardTitle>
              <CardDescription>
                Unlock unlimited access to AI-powered Codeforces assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">$20</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Unlimited AI conversations",
                  "Access to all Codeforces problems",
                  "Code execution & testing",
                  "Solution explanations & hints",
                  "Priority support",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Payments are processed securely by Stripe. You can cancel anytime.
        </p>
      </div>
    </div>
  );
}
