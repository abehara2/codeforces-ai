"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/chat");
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <main className="h-screen bg-[#F7F7F4] overflow-hidden flex flex-col justify-center md:justify-start md:pt-0">
      {/* Main Content */}
      <div className="px-6 md:px-24 lg:px-32 md:pt-16">
        {/* Tagline */}
        <h2 className="text-4xl md:text-5xl font-normal text-black max-w-2xl leading-snug mb-8 md:mb-16 font-[family-name:var(--font-playfair)]">
          Built to coach the world's best competitive programmers.
        </h2>
      </div>

      {/* Image section wrapper */}
      <div className="mt-4 md:mt-0 px-6 md:px-24 lg:px-32">
        {/* Image container */}
        <div className="relative group shadow-2xl rounded-t-3xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/CODE.png"
            alt="Code editor view"
            className="w-full rounded-t-3xl min-w-[800px]"
          />
          {/* Overlay with blur - covers visible area */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] md:backdrop-blur-md md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-center md:items-start md:pt-72 justify-center rounded-t-3xl">
            <Link
              href="/sign-in"
              className="px-8 py-4 text-lg font-medium text-white bg-black hover:bg-black/80 transition-colors font-[family-name:var(--font-space-mono)] inline-flex items-center gap-2"
            >
              Sign in
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
