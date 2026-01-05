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
    <main className="min-h-screen bg-[#0c0c0c] text-[#ededed] overflow-x-hidden relative font-[family-name:var(--font-inter)]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c] via-[#111111] to-[#0c0c0c]" />

      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-radial from-[#ffffff]/[0.03] via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center px-6 pt-16 pb-10 md:pt-20 md:pb-12">
          {/* Tagline */}
          <h1 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-medium text-center max-w-3xl leading-[1.15] tracking-[-0.02em] text-white">
            Built to coach the world&apos;s best competitive programmers.
          </h1>

          {/* CTA Button */}
          <Link
            href="/sign-in"
            className="mt-8 md:mt-10 px-5 py-2.5 text-sm font-medium bg-white text-[#0c0c0c] hover:bg-[#e5e5e5] transition-colors duration-150 inline-flex items-center gap-2 group"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Image Section */}
        <div className="px-4 md:px-8 lg:px-16 pb-16">
          <div className="relative mx-auto max-w-5xl">
            {/* Image container */}
            <div
              className="relative overflow-hidden border border-white/10"
              style={{
                borderRadius: '12px',
                boxShadow: '0 0 80px 20px rgba(255, 180, 100, 0.12), 0 0 120px 40px rgba(255, 140, 80, 0.08)'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/CODE.png"
                alt="Code editor view"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
