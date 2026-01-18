"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeColor = "blue" | "red" | "green";

interface ThemeColorContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(
  undefined,
);

export function ThemeColorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeColor, setThemeColorInternal] = useState<ThemeColor>(() => {
    if (typeof window === "undefined") return "blue";
    const savedColor = localStorage.getItem("theme-color");
    if (
      savedColor === "blue" ||
      savedColor === "red" ||
      savedColor === "green"
    ) {
      return savedColor;
    }
    return "blue";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme-color", themeColor);
  }, [themeColor]);

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorInternal(color);
    localStorage.setItem("theme-color", color);
    document.documentElement.setAttribute("data-theme-color", color);
  };

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext);
  if (!context) {
    throw new Error("useThemeColor must be used within a ThemeColorProvider");
  }
  return context;
}
