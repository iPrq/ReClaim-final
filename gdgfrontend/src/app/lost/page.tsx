"use client";

import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { AnimatePresence, motion } from "framer-motion";
import {
  Image as ImageIcon,
  Zap,
  ZapOff,
  X,
  Loader2,
  MapPin,
  Calendar,
  Box,
} from "lucide-react";
import NextImage from "next/image";

/* ================= CONFIG ================= */
const API = process.env.NEXT_PUBLIC_BACKEND_URL!;

/* ================= TYPES ================= */
interface Result {
  match: boolean;
  item: string;
  confidence: number;
}

interface ItemDetails {
  item: string;
  timestamp: string;
  lastSeenLocation: string; // Placeholder
  submittedTo: string; // Placeholder
}

/* ================= UTILS ================= */
const base64ToFile = (dataUrl: string, filename: string) => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const submitLostItem = async (imageBase64: string | null): Promise<Result> => {
  if (!imageBase64) throw new Error("No image data");

  const file = base64ToFile(imageBase64, "capture.jpg");
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API}/search`, {
    method: "POST",
    body: fd,
  });
  return await res.json();
};

/* ================= MAIN COMPONENT ================= */
export default function Page() {
  const [openConfirm, setOpenConfirm] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [matchImageUrl, setMatchImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ---------- CAMERA LOGIC ---------- */
  const openCamera = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Camera.checkPermissions();
        if (perm.camera !== "granted") {
          await Camera.requestPermissions();
        }
      }
      startCamera();
    } catch (err) {
      console.error("Camera permission error", err);
    }
  };

  const startCamera = async () => {
    try {
      setVideoReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => {
    openCamera();
    return () => stopCamera();
  }, []);

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const targetRatio = 3 / 4;

      let cropW, cropH, cropX, cropY;
      if (videoW / videoH > targetRatio) {
        cropH = videoH;
        cropW = cropH * targetRatio;
        cropX = (videoW - cropW) / 2;
        cropY = 0;
      } else {
        cropW = videoW;
        cropH = cropW / targetRatio;
        cropX = 0;
        cropY = (videoH - cropH) / 2;
      }

      canvas.width = cropW;
      canvas.height = cropH;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(
          video,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        stopCamera();
        setImageBase64(dataUrl);
        setOpenConfirm(true);
      }
    }
  };

  const uploadFromGallery = async () => {
    const photo = await Camera.getPhoto({
      source: CameraSource.Photos,
      resultType: CameraResultType.Base64,
      quality: 90,
    });
    if (photo.base64String) {
      setImageBase64(`data:image/jpeg;base64,${photo.base64String}`);
      stopCamera();
      setOpenConfirm(true);
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newFlashState = !flashOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newFlashState }],
      });
      setFlashOn(newFlashState);
    } catch (err) {
      console.error("Flash not supported", err);
    }
  };

  /* ---------- AI & SEARCH LOGIC ---------- */
  const handleFormSubmission = async () => {
    setLoading(true);
    try {
      const data = await submitLostItem(imageBase64);
      setResult(data);

      if (data.match && data.item) {
        const imgRes = await fetch(
          `${API}/items/${encodeURIComponent(data.item)}/images`,
        );
        const imgData = await imgRes.json();
        if (imgData.images && imgData.images.length > 0) {
          setMatchImageUrl(
            `${API}/items/${encodeURIComponent(data.item)}/image/${imgData.images[0]}`,
          );
        }
      }
    } catch (error) {
      console.error("Submission error", error);
    }
    setOpenConfirm(false);
    setLoading(false);
  };

  const fetchItemDetails = async () => {
    if (!result?.item) return;
    setDetailsLoading(true);
    try {
      // Note: We're fetching metadata to get the timestamp
      const res = await fetch(
        `${API}/items/${encodeURIComponent(result.item)}/images`,
      );
      const data = await res.json();

      // Placeholder data as requested combined with real API name/timestamp
      setItemDetails({
        item: result.item,
        timestamp: data.timestamp || new Date().toISOString(),
        lastSeenLocation: "Main Library - Level 2 Study Area", // Placeholder
        submittedTo: "Campus Security Office (Building A)", // Placeholder
      });
      setShowDetailsModal(true);
    } catch (error) {
      console.error("Error fetching details", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeResult = () => {
    setResult(null);
    setMatchImageUrl(null);
    setImageBase64(null);
    setItemDetails(null);
    setShowDetailsModal(false);
    startCamera();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-x-hidden flex flex-col">
      {/* HEADER */}
      {!openConfirm && !result && (
        <div className="w-full pt-10 pb-4 text-center z-20 bg-background sticky top-0">
          <h1 className="text-xl font-semibold tracking-wide">
            Report a Lost Item
          </h1>
        </div>
      )}

      {/* CAMERA VIEW */}
      {!openConfirm && !result && (
        <div className="flex-1 flex flex-col relative w-full h-[calc(100vh-theme(spacing.16))]">
          <div className="w-full px-6 mb-4 z-20 relative pt-2">
            <div className="mx-auto max-w-sm rounded-full bg-card-bg/80 backdrop-blur-md border border-border-custom px-6 py-2 flex items-center gap-3 shadow-lg">
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <div>
                 <p className="text-xs font-semibold text-foreground">AI Scanner Ready</p>
                 <p className="text-[10px] text-secondary-text">Center item in frame</p>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="relative w-full z-10 flex-1 flex flex-col justify-center items-center px-4 -mt-10">
            <div className="relative overflow-hidden shadow-2xl bg-black rounded-[2rem] w-full max-w-sm aspect-[3/4] border-2 border-border-custom">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onCanPlay={() => setVideoReady(true)}
                className={`w-full h-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
              />
               {/* Grid overlay for better framing */}
               <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                  <div className="border-r border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-white"></div>
                  <div className="border-r border-white"></div>
                  <div></div>
               </div>

              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2
                    className="animate-spin text-primary"
                    size={32}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="w-full pb-10 pt-6 flex justify-center items-center gap-12 z-20 bg-background mt-auto border-t border-border-custom shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl">
            <button
              onClick={uploadFromGallery}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-btn-bg hover:bg-btn-hover border border-border-custom active:scale-95 transition-all text-foreground"
            >
              <ImageIcon size={22} />
            </button>
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-primary bg-foreground focus:outline-none focus:ring-4 focus:ring-primary/40 active:scale-95 transition-all"
            />
            <button
              onClick={toggleFlash}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition ${flashOn ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" : "bg-btn-bg border-border-custom text-secondary-text"}`}
            >
              {flashOn ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {openConfirm && imageBase64 && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute top-6 left-6 z-20 p-2 bg-btn-bg hover:bg-btn-hover rounded-full transition-colors cursor-pointer border border-border-custom"
              onClick={closeResult}
            >
              <X size={24} className="text-foreground" />
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
               <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative"
               >
                 <img
                   src={imageBase64}
                   alt="captured"
                   className="w-full max-w-sm aspect-[3/4] object-cover rounded-3xl shadow-2xl border border-border-custom"
                 />
                 <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5 dark:ring-white/10 pointer-events-none" />
               </motion.div>
               
               <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mt-8 text-center"
               >
                   <h2 className="text-2xl font-bold text-foreground mb-2">Use this photo?</h2>
                   <p className="text-secondary-text text-sm max-w-xs mx-auto">
                     Ensure the item is clearly visible and centered for best results.
                   </p>
               </motion.div>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-6 pb-10 bg-background/80 backdrop-blur-md border-t border-border-custom">
              <div className="flex gap-4 max-w-md mx-auto">
                <button
                  onClick={closeResult}
                  className="flex-1 py-4 rounded-2xl bg-btn-bg text-foreground font-medium border border-border-custom hover:bg-btn-hover transition-colors"
                >
                  Retake
                </button>
                <button
                  onClick={handleFormSubmission}
                  disabled={loading}
                  className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-[0_4px_15px_rgba(var(--primary-rgb),0.3)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Run Analysis"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULT OVERLAY */}
      <AnimatePresence>
        {result && !showDetailsModal && (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="w-full max-w-sm bg-card-bg rounded-3xl p-8 shadow-2xl border border-border-custom relative overflow-hidden"
            >
               {/* Decorative background gradient */}
               <div className={`absolute top-0 inset-x-0 h-40 bg-gradient-to-b ${result.match ? "from-primary/10" : "from-zinc-500/10"} to-transparent pointer-events-none`} />

              <div className="relative z-10 flex flex-col items-center">
                {result.match && matchImageUrl ? (
                  <div className="relative w-32 h-32 mb-6 rounded-full overflow-hidden border-4 border-primary shadow-[0_8px_30px_rgba(var(--primary-rgb),0.3)]">
                    <img
                      src={matchImageUrl}
                      alt={result.item}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 mb-6 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <X size={40} className="text-zinc-400" />
                  </div>
                )}
    
                <h2 className="text-2xl font-bold mb-3 text-foreground">
                  {result.match ? "Match Found!" : "No Match Found"}
                </h2>
                <p className="text-sm text-secondary-text mb-8 leading-relaxed">
                  {result.match
                    ? `We found a "${result.item}" that looks very similar to your item.`
                    : "We couldn't find any items that look like this in our records right now."}
                </p>
    
                <button
                  onClick={result.match ? fetchItemDetails : closeResult}
                  disabled={detailsLoading}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                     result.match 
                     ? "bg-primary text-white shadow-[0_4px_20px_rgba(var(--primary-rgb),0.3)] hover:brightness-110" 
                     : "bg-btn-bg text-foreground border border-border-custom hover:bg-btn-hover"
                  }`}
                >
                  {detailsLoading ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : result.match ? (
                    "View Item Details"
                  ) : (
                    "Try Again"
                  )}
                </button>
    
                {result.match && (
                  <button
                    onClick={closeResult}
                    className="mt-4 text-sm text-secondary-text font-medium hover:text-foreground transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ITEM DETAILS MODAL */}
      <AnimatePresence>
        {showDetailsModal && itemDetails && (
          <motion.div
            className="fixed inset-0 z-[80] flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-md sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card-bg sm:rounded-[2rem] rounded-t-[2.5rem] p-8 pb-10 shadow-2xl border-t sm:border border-border-custom max-w-lg w-full relative overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
               {/* Decorative header blob */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-8 sm:hidden opacity-50" />

              <div className="flex items-start justify-between mb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">{itemDetails.item}</h2>
                  <div className="flex items-center gap-2 mt-2">
                     <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                     <p className="text-primary font-bold text-sm tracking-wide uppercase">
                     Verified Match
                     </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2.5 bg-btn-bg hover:bg-btn-hover rounded-full border border-border-custom transition-colors"
                >
                  <X size={20} className="text-foreground" />
                </button>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-5 p-4 rounded-2xl bg-btn-bg/50 border border-border-custom/50">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-secondary-text uppercase tracking-wider font-bold mb-0.5">
                      Reported On
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {formatDate(itemDetails.timestamp).day} <span className="text-secondary-text font-normal">at</span> {formatDate(itemDetails.timestamp).time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 p-4 rounded-2xl bg-btn-bg/50 border border-border-custom/50">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-secondary-text uppercase tracking-wider font-bold mb-0.5">
                      Last Known Location
                    </p>
                    <p className="text-base font-semibold text-foreground leading-tight">
                      {itemDetails.lastSeenLocation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 p-4 rounded-2xl bg-btn-bg/50 border border-border-custom/50">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Box size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-secondary-text uppercase tracking-wider font-bold mb-0.5">
                      Currently At
                    </p>
                    <p className="text-base font-semibold text-foreground leading-tight">
                      {itemDetails.submittedTo}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 relative z-10">
                <button
                  onClick={closeResult}
                  className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-[0_4px_20px_rgba(var(--primary-rgb),0.3)] hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  Confirm & Finish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
