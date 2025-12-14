"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/chat");
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black mb-2">
            CODEFORCES AI
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide">
            AI-POWERED COMPETITIVE PROGRAMMING ASSISTANT
          </p>
        </div>
        <div className="border border-border">
          <SignIn
            routing="hash"
            forceRedirectUrl="/chat"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 rounded-none",
                headerTitle: "font-bold",
                headerSubtitle: "text-muted-foreground",
                formButtonPrimary:
                  "bg-black hover:bg-black/90 text-white rounded-none",
                formFieldInput: "rounded-none border-border",
                footerActionLink: "text-black hover:text-black/80",
                identityPreviewEditButton: "text-black",
                formFieldAction: "text-black",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
