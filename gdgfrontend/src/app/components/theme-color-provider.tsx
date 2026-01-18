"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeColor = "blue" | "red" | "green";

interface ThemeColorContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>("blue");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedColor = localStorage.getItem("theme-color") as ThemeColor;
    if (savedColor) {
      setThemeColorState(savedColor);
      document.documentElement.setAttribute("data-theme-color", savedColor);
    } else {
      document.documentElement.setAttribute("data-theme-color", "blue");
    }
    setMounted(true);
  }, []);

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem("theme-color", color);
    document.documentElement.setAttribute("data-theme-color", color);
  };

  // Prevent flash by not rendering until mounted (optional, but good for consistency)
  // However, for colors, it might be better to render even if default to avoid layout shift, only color shift.
  
  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error("useThemeColor must be used within a ThemeColorProvider");
  }
  return context;
}
