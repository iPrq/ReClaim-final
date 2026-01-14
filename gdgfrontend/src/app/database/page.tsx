"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

/* ================= TYPES ================= */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export interface ReportedItem {
  id: string;
  name: string;
  description: string;
  foundLocation?: string;
  currentLocation?: string;
  dateReported: string;
  images: string[];
  type: "lost" | "found";
}

interface ApiItem {
  name?: string;
  thumbnail?: string;
}

interface ItemsApiResponse {
  items?: ApiItem[];
}

/* ================= THEME ================= */
const THEME = {
  bg: "#000000",
  textPrimary: "#FFFFFF",
  textSecondary: "#9CA3AF",
  yellow: "#FFD60A",
  buttonBg: "#1C1C1E",
  border: "#27272A",
};



/* ================= MAIN COMPONENT ================= */
export default function LostAndFound() {
  const [items, setItems] = useState<ReportedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const [activeItem, setActiveItem] = useState<ReportedItem | null>(null);

  /* -------- FETCH DATA (Backend integration) -------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/items-list`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data: ItemsApiResponse = await res.json();

        // Transform API data to match ReportedItem interface
        const transformed: ReportedItem[] = (data.items ?? []).map(
          (item, index) => ({
            id: item.name ?? `item-${index}`,
            name: item.name ?? "Unknown Item",
            description: "No description available",
            foundLocation: "Unknown Location",
            currentLocation: "RV University",
            images: [
              item.thumbnail ??
                "https://via.placeholder.com/400x300?text=No+Image",
            ],
            dateReported: new Date().toISOString(),
            type: "found",
          })
        );
        
        setItems(transformed);
      } catch (e) {
        console.error("Backend fetch failed", e);
        setItems([]); 
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime();
  });

  return (
    <div
      className="min-h-screen px-4 py-10 relative"
      style={{ backgroundColor: THEME.bg, color: THEME.textPrimary }}
    >
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <Loader2 className="animate-spin mb-4" size={48} style={{ color: THEME.yellow }} />
            <p className="text-sm font-medium tracking-wide">
              Fetching Database...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <h1 className="text-3xl font-semibold">
          Find Reported Items
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: THEME.textSecondary }}
        >
          Helping lost belongings find their way back safely 
        </p>

        {/* SORT CONTROLS */}
        <div className="mt-6 flex gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg px-4 py-2 text-sm outline-none"
            style={{
              backgroundColor: THEME.buttonBg,
              border: `1px solid ${THEME.border}`,
              color: THEME.textPrimary,
            }}
          >
            <option value="name">Name A–Z</option>
            <option value="date">Date & Time</option>
          </select>
        </div>

        {/* GRID */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => setActiveItem(item)}
            />
          ))}
        </div>
      </div>

      {/* MODAL */}
      {activeItem && (
        <ItemModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}

/* ================= ITEM CARD ================= */
function ItemCard({ item, onClick }: { item: ReportedItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-xl overflow-hidden transition hover:scale-[1.02]"
      style={{
        backgroundColor: "#0A0A0A",
        border: `1px solid ${THEME.border}`,
      }}
    >
      <img
        src={item.images[0]}
        alt={item.name}
        className="h-40 w-full object-cover"
        onError={(e) => {
          e.currentTarget.src =
            "https://via.placeholder.com/400x300?text=No+Image";
        }}
      />

      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white">{item.name}</h3>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${THEME.yellow}20`,
              color: THEME.yellow,
            }}
          >
            FOUND
          </span>
        </div>

        <p
          className="mt-2 text-sm line-clamp-2"
          style={{ color: THEME.textSecondary }}
        >
          {item.description}
        </p>
      </div>
    </button>
  );
}

/* ================= MODAL ================= */
function ItemModal({ item, onClose }: { item: ReportedItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="relative w-full max-w-4xl mx-4">
        {/* TOP HANDLE / ARROW */}
        <div className="flex justify-center mb-3">
          <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
        </div>

        {/* MODAL CARD */}
        <div
          className="rounded-2xl overflow-hidden shadow-xl"
          style={{ backgroundColor: "#0A0A0A" }}
        >
          {/* IMAGE GALLERY */}
          <div className="grid grid-cols-3 gap-1">
            {item.images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt=""
                className="h-44 w-full object-cover"
              />
            ))}
          </div>

          {/* CONTENT */}
          <div className="p-8">
            {/* HEADER */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {item.name}
                </h2>
                <span className="mt-2 inline-block text-xs tracking-wide px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400">
                  FOUND ITEM
                </span>
              </div>

              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white text-xl"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* DESCRIPTION */}
            <p className="mt-6 text-sm text-zinc-400 leading-relaxed max-w-2xl">
              {item.description}
            </p>

            {/* DIVIDER */}
            <div className="my-8 h-px bg-zinc-800" />

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <InfoBlock
                label="Item Found At"
                value={item.foundLocation}
              />
              <InfoBlock
                label="Current Location"
                value={item.currentLocation}
              />
              <InfoBlock
                label="Date Reported"
                value={new Date(item.dateReported).toLocaleString()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= INFO BLOCK ================= */
function InfoBlock({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-zinc-500 mb-1 font-medium">{label}</p>
      <p className="text-white font-medium">{value || "N/A"}</p>
    </div>
  );
}
