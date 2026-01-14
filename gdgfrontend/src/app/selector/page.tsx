"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const THEME = {
  bg: "#000000",
  textPrimary: "#FFFFFF",
  textSecondary: "#B0B0B0",
  blue: "#007BFF",
  red: "#FF3B30",
  yellow: "#FFD60A",
  buttonBg: "#1C1C1E",
  buttonHover: "#2C2C2E",
  border: "#3A3A3C",
};

export default function OptionsPage() {
  const router = useRouter();

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden px-4 py-12"
      style={{ backgroundColor: THEME.bg }}
    >
      {/* ================= BACKGROUND GLOW ================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/2 -left-1/2 w-[120vw] h-[120vw] rounded-full blur-[120px]"
          style={{ backgroundColor: THEME.blue, opacity: 0.07 }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-0 w-[100vw] h-[100vw] rounded-full blur-[120px]"
          style={{ backgroundColor: THEME.red, opacity: 0.07 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col gap-10">

        {/* ================= TITLE (LEFT-CENTERED) ================= */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-left"
        >
          <h1
            className="text-5xl font-bold leading-tight"
            style={{ color: THEME.textPrimary }}
          >
            What brings you here?
          </h1>

          {/* Bumbly text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 text-base"
            style={{ color: THEME.textSecondary }}
          >
            Lost something important… or did you just help someone find theirs?
          </motion.p>

          {/* Campus line */}
          <p
            className="mt-4 text-sm flex items-center gap-2"
            style={{ color: THEME.textSecondary }}
          >
            📍 RV University · Main Campus
            <span
              className="px-2 py-[2px] rounded-full text-xs border"
              style={{
                color: THEME.yellow,
                borderColor: THEME.border,
              }}
            >
              Verified
            </span>
          </p>
        </motion.div>

        {/* ================= ACTION CARDS ================= */}
        <div className="flex flex-col gap-6">
          <SelectionCard
            title="Lost Something?"
            image="/images/Lostpersonimage.png"
            accent={THEME.red}
            onClick={() => router.push("/lost")}
          />

          <SelectionCard
            title="Found Something?"
            image="/images/Founditemperson.png"
            accent={THEME.blue}
            onClick={() => router.push("/found")}
          />
        </div>
      </div>
    </div>
  );
}

/* ================= CARD COMPONENT ================= */

function SelectionCard({
  title,
  image,
  accent,
  onClick,
}: {
  title: string;
  image: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="cursor-pointer rounded-3xl overflow-hidden"
      style={{
        backgroundColor: accent,
        border: `1px solid ${THEME.border}`,
      }}
    >
      <div className="relative p-6 flex flex-col items-center gap-5">
        {/* Image */}
        <motion.img
          src={image}
          alt={title}
          className="h-44 object-contain"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Title */}
        <div className="w-full text-center py-2">
          <p className="text-3xl font-bold text-white">
            {title}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
