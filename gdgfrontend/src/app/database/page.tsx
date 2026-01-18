"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

/* ================= CONFIG ================= */
const API = "https://campus-search-api-680513043824.us-central1.run.app";

/* ================= TYPES ================= */
export interface ReportedItem {
  id: string;
  name: string;
  description: string;
  images: string[];
  dateReported: string;
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
          data.items.map(async (name) => {
            try {
              const imgRes = await fetch(
                `${API}/items/${encodeURIComponent(name)}/images`,
              );
              const imgData: ImagesResponse = await imgRes.json();

              return {
                id: name,
                name,
                description: "Reported found on campus",
                images: imgData.images ?? [],
                dateReported: new Date().toISOString(),
              };
            } catch {
              return {
                id: name,
                name,
                description: "Reported found on campus",
                images: [],
                dateReported: new Date().toISOString(),
              };
            }
          }),
        );

        setItems(enriched);
      } catch (e) {
        console.error(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ================= SORTING ================= */
  const sortedItems = useMemo(() => {
    if (sortMode === "az") {
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...items].sort(
      (a, b) =>
        new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime(),
    );
  }, [items, sortMode]);

  return (
    <div className="min-h-screen px-4 py-10 bg-background text-foreground">
      {/* LOADER */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur"
          >
            <Loader2 className="animate-spin mb-3" size={40} />
            <p className="text-sm">Loading items…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold">Lost & Found</h1>
        <p className="text-sm text-secondary-text mt-1">
          Items reported on campus
        </p>

        {/* FILTERS */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setSortMode("date")}
            className={`px-4 py-2 rounded-lg text-sm border transition ${
              sortMode === "date"
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortMode("az")}
            className={`px-4 py-2 rounded-lg text-sm border transition ${
              sortMode === "az"
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            A → Z
          </button>
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

      {activeItem && (
        <ItemModal item={activeItem} onClose={() => setActiveItem(null)} />
      )}
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

  /* Prefetch modal images on hover */
  const prefetchImages = () => {
    item.images.forEach((img) => {
      const i = new window.Image();
      i.src = `${API}/items/${encodeURIComponent(item.name)}/image/${img}`;
    });
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={prefetchImages}
      className="text-left rounded-xl overflow-hidden border bg-card-bg hover:scale-[1.02] transition"
    >
      <div className="relative h-40 w-full">
        <Image
          src={imgSrc}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
          loading="lazy"
        />
      </div>

      <div className="p-4">
        <h3 className="font-medium">{item.name}</h3>
        <p className="mt-2 text-sm text-secondary-text line-clamp-2">
          {item.description}
        </p>
      </div>
    </button>
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-card-bg rounded-2xl max-w-4xl w-full mx-4 overflow-hidden">
        {/* IMAGES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {item.images.map((img) => (
            <div key={img} className="relative h-44 w-full">
              <Image
                src={`${API}/items/${encodeURIComponent(item.name)}/image/${img}`}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
                priority
              />
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-semibold">{item.name}</h2>
            <button
              onClick={onClose}
              className="text-xl text-secondary-text hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <p className="mt-4 text-sm text-secondary-text">{item.description}</p>
        </div>
      </div>
    </div>
  );
}
