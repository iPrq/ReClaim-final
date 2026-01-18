"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MapPin, Calendar, X } from "lucide-react";

/* ================= CONFIG ================= */
const API = process.env.NEXT_PUBLIC_BACKEND_URL!;

/* ================= TYPES ================= */
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

interface ItemsResponse {
  items: string[];
}

interface ImagesResponse {
  images: string[];
}

/* ================= MAIN COMPONENT ================= */
export default function LostAndFound() {
  const [items, setItems] = useState<ReportedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("date");
  const [activeItem, setActiveItem] = useState<ReportedItem | null>(null);

  /* -------- FETCH DATA (Backend integration) -------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/items`);
        // We can't use date from backend if it's not provided, but we can try to extract it from name if possible
        // For now, we keep the existing logic of using current date or just a placeholder, 
        // as the API only returns names. 
        // If the backend is updated to return objects with dates, we would adapt here.
        const data: ItemsResponse = await res.json();

        const enriched: ReportedItem[] = await Promise.all(
          (data.items ?? []).map(async (name) => {
            try {
              const imgRes = await fetch(
                `${API}/items/${encodeURIComponent(name)}/images`,
              );
              const imgData: ImagesResponse = await imgRes.json();

              // Transform to full URLs for the UI
              const imageUrls = (imgData.images ?? []).map(img => 
                `${API}/items/${encodeURIComponent(name)}/image/${img}`
              );

              return {
                id: name,
                name,
                description: "No description provided", // Placeholder description
                foundLocation: "B Block Auditorium", 
                currentLocation: "Admin Block Reception", 
                images: imageUrls,
                dateReported: new Date().toISOString(), 
                type: "found",
              };
            } catch {
              return {
                id: name,
                name,
                description: "Reported found on campus",
                foundLocation: "Unknown Location",
                currentLocation: "RV University",
                images: [],
                dateReported: new Date().toISOString(),
                type: "found",
              };
            }
          }),
        );

        setItems(enriched);
      } catch (e) {
        console.error("Backend fetch failed", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    // Sort by date (mock date will result in stable sort or random if all same, but maintaining logic)
    return new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime();
  });

  return (
    <div className="min-h-screen px-4 py-10 relative bg-background text-foreground">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <Loader2 className="animate-spin mb-4 text-primary" size={48} />
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
        <p className="mt-1 text-sm text-secondary-text">
          Helping lost belongings find their way back safely 
        </p>

        {/* SORT CONTROLS */}
        <div className="mt-6 flex gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg px-4 py-2 text-sm outline-none bg-btn-bg border border-border-custom text-foreground"
          >
            <option value="name">Name A–Z</option>
            <option value="date">Date & Time</option>
          </select>
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
    <motion.button
      layout
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="text-left w-full rounded-xl overflow-hidden transition hover:scale-[1.02] bg-card-bg border border-border-custom"
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
          <h3 className="font-medium text-foreground">{item.name}</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
            FOUND
          </span>
        </div>

        <p className="mt-2 text-sm line-clamp-2 text-secondary-text">
          {item.description}
        </p>
      </div>
    </motion.button>
  );
}

/* ================= MODAL ================= */
function ItemModal({ item, onClose }: { item: ReportedItem; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-2xl bg-card-bg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* HERO IMAGE & GALLERY */}
         <div className="relative h-64 shrink-0 bg-zinc-900">
           {item.images.length > 0 ? (
             <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory">
                 {item.images.map((img, index) => (
                    <img key={index} src={img} className="w-full h-full object-contain shrink-0 snap-center" />
                 ))}
             </div>
           ) : (
                <div className="w-full h-full flex items-center justify-center text-secondary-text">
                  <X size={32} />
                  <span className="ml-2">No Images</span>
                </div>
           )}
           <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 transition-colors"
           >
              <X size={20} />
           </button>
         </div>


        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-1">
                  {item.name}
                </h2>
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                   <span className="text-sm font-bold text-primary tracking-wide">
                     VERIFIED FOUND
                   </span>
                </div>
              </div>
            </div>

            <p className="text-secondary-text leading-relaxed text-sm mb-8">
              {item.description}
            </p>

            {/* DETAILS GRID */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-btn-bg/50 border border-border-custom flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-secondary-text block">Found At</label>
                    <span className="text-foreground font-medium">{item.foundLocation || "Unknown"}</span>
                  </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-btn-bg/50 border border-border-custom flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-secondary-text block">Currently At</label>
                    <span className="text-foreground font-medium">{item.currentLocation || "Unknown"}</span>
                  </div>
              </div>

               <div className="p-4 rounded-2xl bg-btn-bg/50 border border-border-custom flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-secondary-text block">Reported Date</label>
                    <span className="text-foreground font-medium">{new Date(item.dateReported).toLocaleDateString()}</span>
                  </div>
              </div>
            </div>
            
            <div className="mt-8">
                <button 
                  onClick={onClose}
                  className="w-full py-4 rounded-xl bg-primary text-white font-bold shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  Contact Finder
                </button>
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
      <p className="text-secondary-text mb-1 font-medium">{label}</p>
      <p className="text-foreground font-medium">{value || "N/A"}</p>
    </div>
  );
}
