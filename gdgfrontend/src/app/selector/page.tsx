"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function OptionsPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-hidden px-4 py-12 bg-background transition-colors duration-300">

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col gap-10">

        {/* ================= TITLE (LEFT-CENTERED) ================= */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-left"
        >
          <h1 className="text-4xl font-bold leading-tight text-foreground">
            What brings you here?
          </h1>

         {/* Title Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-2 text-sm text-secondary-text"
          >
            Lost something important… or did you just help someone find theirs?
          </motion.p>

          {/* Campus line */}
          <p className="mt-3 text-xs flex items-center gap-2 text-secondary-text">
            📍 RV University · Main Campus
            <span className="px-2 py-[2px] rounded-full text-[10px] border border-border-custom text-accent-yellow">
              Verified
            </span>
          </p>
        </motion.div>

        {/* ================= ACTION CARDS ================= */}
        <div className="flex flex-col gap-4">
          <SelectionCard
            title="Lost Something?"
            image="/images/Lostpersonimage.png"
            accent="var(--accent-yellow)"
            onClick={() => router.push("/lost")}
          />

          <SelectionCard
            title="Found Something?"
            image="/images/Founditemperson.png"
            accent="var(--accent-purple)"
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
      className="cursor-pointer rounded-2xl overflow-hidden border-2 shadow-lg relative bg-card-bg"
      style={{
        borderColor: accent,
      }}
    >
      {/* Subtle tint overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{ backgroundColor: accent }}
      />

      <div className="relative p-5 flex flex-col items-center gap-3 z-10">
        {/* Image */}
        <motion.img
          src={image}
          alt={title}
          className="h-32 object-contain drop-shadow-lg"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Title */}
        <div className="w-full text-center py-1">
          <p className="text-2xl font-bold text-foreground drop-shadow-md">
            {title}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
