"use client";

import { useState } from "react";
import Image from "next/image";
import AuthGate from "@/app/components/AuthGate";

export default function GetStartedPage() {
  const [showAuthGate, setShowAuthGate] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{ "--accent-yellow": "#FFD60A" } as React.CSSProperties}
    >
      {showAuthGate && <AuthGate />}

      {!showAuthGate && (
        <div className="relative h-screen w-full overflow-hidden">
          {/* BACKGROUND IMAGE */}
          <Image
            src="/images/getstartedbg.jpg"
            alt="Get Started Background"
            fill
            priority
            className="object-cover pb-20"
          />

          {/* GRADIENT OVERLAY */}
          <div
            className="
              absolute inset-0
              bg-gradient-to-t
              from-black/90
              via-black/60
              to-black/10
              backdrop-blur-[2px]
            "
          />

          {/* CONTENT */}
          <div className="relative z-10 flex flex-col h-full justify-end px-6 pb-32 text-center">
            {/* Title */}
            <div className="mb-10">
              <h1 className="text-white text-[44px] font-semibold tracking-tight">
                Reclaim
              </h1>
              <p className="mt-2 text-gray-300/80 text-sm">
                Helping lost things return
              </p>
            </div>

            {/* Legal */}
            <p className="text-[11px] text-gray-400/80 leading-relaxed mb-10">
              Read our{" "}
              <a
                href="/privacy"
                className="text-[var(--accent-yellow)] underline underline-offset-2"
              >
                Privacy Policy
              </a>
              . Tap “Get Started” to accept the{" "}
              <a
                href="/terms"
                className="text-[var(--accent-yellow)] underline underline-offset-2"
              >
                Terms of Service
              </a>
              .
            </p>
          </div>

          {/* CTA BUTTON */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-[max(env(safe-area-inset-bottom),2rem)]">
            <button
              onClick={() => setShowAuthGate(true)}
              className="
                w-full
                bg-white
                text-black
                text-lg
                font-semibold
                py-5
                rounded-3xl
                shadow-[0_10px_30px_rgba(0,0,0,0.25)]
                transition
                active:scale-[0.96]
              "
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
