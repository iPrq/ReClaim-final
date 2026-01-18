"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MapPin, Calendar, X } from "lucide-react";

/* ================= CONFIG ================= */
const API = process.env.NEXT_PUBLIC_BACKEND_URL!;

/* ================= TYPES ================= */
export interface ReportedItem {
  id: string;
  name: string;

  images: string[];
  dateReported: string;
  foundLocation?: string;
  currentLocation?: string;
}

interface ItemsResponse {
  items: string[];
}

interface ImagesResponse {
  images: string[];
}

type SortMode = "date" | "az";

/* ================= MAIN ================= */
export default function LostAndFound() {
  const [items, setItems] = useState<ReportedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<ReportedItem | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("date");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/items`);
        const data: ItemsResponse = await res.json();

        const enriched: ReportedItem[] = await Promise.all(
          (data.items ?? []).map(async (name) => {
            try {
              const imgRes = await fetch(
                `${API}/items/${encodeURIComponent(name)}/images`,
              );
              const imgData: ImagesResponse = await imgRes.json();

              return {
                id: name,
                name,
                images: imgData.images ?? [],
                dateReported: new Date().toISOString(),
                foundLocation: "Campus Grounds",
                currentLocation: "Main Office (Block A)",
              };
            } catch {
              return {
                id: name,
                name,
                images: [],
                dateReported: new Date().toISOString(),
              };
            }
          }),
        );

        setItems(enriched);
      } catch (e) {
        console.error("Fetch error:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    if (sortMode === "az") {
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted.sort(
      (a, b) =>
        new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime(),
    );
  }, [items, sortMode]);

  return (
    <div className="min-h-screen px-4 py-10 bg-background text-foreground selection:bg-accent-yellow/30">
      {/* LOADER */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <Loader2
              className="animate-spin mb-4 text-accent-yellow"
              size={48}
            />
            <p className="text-sm font-medium tracking-widest uppercase opacity-70">
              Synchronizing Database...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Lost & Found</h1>
          <p className="text-secondary-text mt-2 text-lg">
            Bridging the gap between lost belongings and their owners.
          </p>
        </header>

        {/* FILTERS */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-secondary-text mr-2">
            Sort By:
          </span>
          <button
            onClick={() => setSortMode("date")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              sortMode === "date"
                ? "bg-foreground text-background shadow-lg"
                : "bg-card-bg border border-border-custom hover:bg-muted"
            }`}
          >
            Recently Added
          </button>
          <button
            onClick={() => setSortMode("az")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              sortMode === "az"
                ? "bg-foreground text-background shadow-lg"
                : "bg-card-bg border border-border-custom hover:bg-muted"
            }`}
          >
            Alphabetical
          </button>
        </div>

        {/* GRID */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => setActiveItem(item)}
            />
          ))}
        </motion.div>

        {sortedItems.length === 0 && !loading && (
          <div className="text-center py-20 border-2 border-dashed border-border-custom rounded-3xl">
            <p className="text-secondary-text">
              No items found in the current registry.
            </p>
          </div>
        )}
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {activeItem && (
          <ItemModal item={activeItem} onClose={() => setActiveItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================= ITEM CARD ================= */
function ItemCard({
  item,
  onClick,
}: {
  item: ReportedItem;
  onClick: () => void;
}) {
  const imgSrc =
    item.images.length > 0
      ? `${API}/items/${encodeURIComponent(item.name)}/image/${item.images[0]}`
      : "/placeholder.png";

  const prefetchImages = () => {
    item.images.forEach((img) => {
      const i = new window.Image();
      i.src = `${API}/items/${encodeURIComponent(item.name)}/image/${img}`;
    });
  };

  return (
    <motion.button
      layout
      whileHover={{ y: -5 }}
      onClick={onClick}
      onMouseEnter={prefetchImages}
      className="group text-left w-full rounded-2xl overflow-hidden border border-border-custom bg-card-bg shadow-sm hover:shadow-xl transition-all"
    >
      <div className="relative h-52 w-full overflow-hidden">
        <Image
          src={imgSrc}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 rounded-full bg-accent-yellow text-black text-[10px] font-bold uppercase tracking-widest shadow-lg">
            Found
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-semibold line-clamp-1 group-hover:text-accent-yellow transition-colors">
          {item.name}
        </h3>

        <div className="mt-4 flex items-center text-[11px] text-secondary-text font-medium uppercase tracking-tighter">
          <Calendar size={12} className="mr-1" />
          {new Date(item.dateReported).toLocaleDateString()}
        </div>
      </div>
    </motion.button>
  );
}

/* ================= MODAL ================= */
function ItemModal({
  item,
  onClose,
}: {
  item: ReportedItem;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-card-bg rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-border-custom"
      >
        {/* GALLERY SECTION */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 bg-black/20">
          {item.images.slice(0, 3).map((img, idx) => (
            <div key={img} className="relative h-48 sm:h-64 w-full">
              <Image
                src={`${API}/items/${encodeURIComponent(item.name)}/image/${img}`}
                alt={`${item.name} gallery ${idx}`}
                fill
                className="object-cover"
                priority
              />
            </div>
          ))}
          {item.images.length === 0 && (
            <div className="col-span-3 h-64 flex items-center justify-center bg-muted/20">
              <p className="text-secondary-text italic">
                No images available for this item
              </p>
            </div>
          )}
        </div>

        {/* CONTENT SECTION */}
        <div className="p-8 sm:p-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-accent-yellow/10 text-accent-yellow text-[10px] font-bold uppercase tracking-widest border border-accent-yellow/20">
                  Securely Stored
                </span>
              </div>
              <h2 className="text-3xl font-bold">{item.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors text-secondary-text hover:text-foreground"
            >
              <X size={24} />
            </button>
          </div>

          <div className="h-px bg-border-custom w-full mb-8" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <InfoBlock
              icon={<MapPin size={16} />}
              label="Found At"
              value={item.foundLocation}
            />
            <InfoBlock
              icon={<Loader2 size={16} />}
              label="Current Custody"
              value={item.currentLocation}
            />
            <InfoBlock
              icon={<Calendar size={16} />}
              label="Reported Date"
              value={new Date(item.dateReported).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-secondary-text uppercase text-[10px] font-bold tracking-widest">
        {icon}
        {label}
      </div>
      <p className="text-foreground font-semibold text-base">
        {value || "Not specified"}
      </p>
    </div>
  );
}
