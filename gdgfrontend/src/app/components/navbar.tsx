"use client";

import Link from "next/link";
import { Search, PackagePlus, Compass, User, Home } from "lucide-react";

type NavTab = "selector" | "lost" | "found" | "discover" | "profile";

interface GlassyNavBarProps {
  activeTab?: NavTab;
}

export default function GlassyNavBar({
  activeTab = "lost",
}: GlassyNavBarProps) {
  const tabs = [
    {
      id: "selector" as NavTab,
      href: "/selector",
      icon: Home,
    },
    {
      id: "lost" as NavTab,
      href: "/lost",
      icon: Search,
    },
    {
      id: "found" as NavTab,
      href: "/found",
      icon: PackagePlus,
    },
    {
      id: "discover" as NavTab,
      href: "/database",
      icon: Compass,
    },
    {
      id: "profile" as NavTab,
      href: "/profile",
      icon: User,
    },
  ];

  const getActiveIndex = () =>
    Math.max(
      0,
      tabs.findIndex((t) => t.id === activeTab)
    );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-custom bg-background/80 backdrop-blur-xl"
      style={{
        fontFamily: "var(--font-poppins), system-ui, sans-serif",
      }}
    >
      {/* Menu List */}
      <div className="flex items-center justify-center pb-[4px] pt-[12px] px-[12px] relative">
        {/* Sliding active background */}
        <div
          className="absolute transition-all duration-500 ease-out rounded-full border border-accent-blue/30 bg-accent-blue/15 shadow-[0_0_20px_var(--accent-blue)]"
          style={{
            left: `calc(12px + ${getActiveIndex()} * (100% - 24px) / 5)`,
            width: `calc((100% - 24px) / 5)`,
            top: "12px",
            height: "48px",
            // Opacity for shadow hack if needed, but var(--accent-blue) is solid. 
            // Let's use opacity in color-mix if supported or just the variable.
            // Simplified shadow for theme compatibility:
            boxShadow: "0 0 20px color-mix(in srgb, var(--accent-blue), transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <div
              key={tab.id}
              className="flex flex-col items-center justify-center flex-1 relative"
            >
              <Link
                href={tab.href}
                className="flex items-center justify-center p-[12px] relative rounded-[100px] shrink-0 transition-all duration-300"
              >
                <div className="w-[24px] h-[24px] flex items-center justify-center">
                  <Icon
                    size={24}
                    strokeWidth={2}
                    // Active: Electric Blue (#007BFF), Secondary Text: Light Gray (#B0B0B0)
                    stroke={isActive ? "var(--accent-blue)" : "var(--text-secondary)"}
                    fill="none"
                    className="transition-all duration-300"
                    style={{
                      filter: isActive
                        ? "drop-shadow(0 0 4px color-mix(in srgb, var(--accent-blue), transparent 40%))"
                        : "none",
                    }}
                  />
                </div>
              </Link>
            </div>
          );
        })}
      </div>

    </div>
  );
}
