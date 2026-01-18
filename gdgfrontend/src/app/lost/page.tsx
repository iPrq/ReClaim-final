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
        <div className="flex-1 flex flex-col relative w-full">
          <div className="w-full px-6 mb-4 z-20 relative">
            <div className="mx-auto max-w-md rounded-xl bg-black/60 backdrop-blur border border-border-custom px-4 py-3">
              <p className="text-sm font-medium text-foreground">A quick tip</p>
              <p className="text-sm text-secondary-text mt-1">
                Clear photos lead to better matches
              </p>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="relative w-full z-10 flex-1 flex flex-col justify-center items-center px-4">
            <div className="relative overflow-hidden shadow-2xl bg-card-bg rounded-3xl w-full max-w-[500px] aspect-[4/5]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onCanPlay={() => setVideoReady(true)}
                className={`w-full h-full object-cover transition-opacity duration-500 ${videoReady ? "opacity-100" : "opacity-0"}`}
              />
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2
                    className="animate-spin text-accent-yellow"
                    size={32}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="w-full py-8 flex justify-center items-center gap-12 z-20 bg-background mt-auto">
            <button
              onClick={uploadFromGallery}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-btn-bg border border-border-custom"
            >
              <ImageIcon size={20} />
            </button>
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-accent-yellow bg-white"
            />
            <button
              onClick={toggleFlash}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition ${flashOn ? "bg-accent-yellow/20 border-accent-yellow text-accent-yellow" : "bg-btn-bg border-border-custom text-secondary-text"}`}
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
              className="absolute top-10 left-6 z-10 p-2 bg-black/50 rounded-full"
              onClick={closeResult}
            >
              <X size={24} className="text-white" />
            </div>
            <div className="flex-1 flex items-center justify-center pt-20 px-4">
              <img
                src={imageBase64}
                alt="captured"
                className="w-full max-w-[500px] aspect-[3/4] object-cover rounded-2xl shadow-2xl"
              />
            </div>
            <div className="p-8 bg-card-bg rounded-t-3xl border-t border-border-custom">
              <h2 className="text-2xl font-semibold">Analyze this photo?</h2>
              <p className="text-sm text-secondary-text mt-2">
                The AI will check this against our database.
              </p>
              <div className="flex gap-4 mt-8">
                <button
                  onClick={closeResult}
                  className="flex-1 py-4 rounded-xl border border-border-custom text-secondary-text"
                >
                  Retake
                </button>
                <button
                  onClick={handleFormSubmission}
                  disabled={loading}
                  className="flex-1 py-4 rounded-xl bg-accent-yellow text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Run AI Analysis"
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
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background px-6 text-center"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {result.match && matchImageUrl ? (
              <div className="relative w-48 h-48 mb-8 rounded-full overflow-hidden border-4 border-accent-yellow shadow-2xl">
                <NextImage
                  src={matchImageUrl}
                  alt={result.item}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 mb-8 bg-muted rounded-full flex items-center justify-center">
                <X size={48} className="text-secondary-text" />
              </div>
            )}

            <h2 className="text-4xl font-bold mb-4">
              {result.match ? "Match Found!" : "No Match Found"}
            </h2>
            <p className="text-lg text-secondary-text max-w-xs mb-10">
              {result.match
                ? `We found a "${result.item}" that matches your photo.`
                : "We couldn't find any items that look like this in our records."}
            </p>

            <button
              onClick={result.match ? fetchItemDetails : closeResult}
              disabled={detailsLoading}
              className="w-full max-w-sm py-4 rounded-2xl bg-accent-yellow text-black font-bold text-lg shadow-lg flex items-center justify-center gap-2"
            >
              {detailsLoading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : result.match ? (
                "View Item Details"
              ) : (
                "Try Another Photo"
              )}
            </button>

            {result.match && (
              <button
                onClick={closeResult}
                className="mt-6 text-secondary-text font-medium"
              >
                Dismiss
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ITEM DETAILS MODAL */}
      <AnimatePresence>
        {showDetailsModal && itemDetails && (
          <motion.div
            className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-background rounded-t-[32px] p-8 pb-12 shadow-2xl border-t border-border-custom max-w-2xl mx-auto w-full"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="w-12 h-1.5 bg-border-custom rounded-full mx-auto mb-8" />

              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold">{itemDetails.item}</h2>
                  <p className="text-accent-yellow font-medium mt-1">
                    Verified Match
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 bg-btn-bg rounded-full border border-border-custom"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-yellow/10 flex items-center justify-center text-accent-yellow">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-secondary-text uppercase tracking-wider font-bold">
                      Reported On
                    </p>
                    <p className="text-lg font-medium">
                      {formatDate(itemDetails.timestamp).day} at{" "}
                      {formatDate(itemDetails.timestamp).time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-yellow/10 flex items-center justify-center text-accent-yellow">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-secondary-text uppercase tracking-wider font-bold">
                      Last Known Location
                    </p>
                    <p className="text-lg font-medium">
                      {itemDetails.lastSeenLocation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-yellow/10 flex items-center justify-center text-accent-yellow">
                    <Box size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-secondary-text uppercase tracking-wider font-bold">
                      Currently At
                    </p>
                    <p className="text-lg font-medium">
                      {itemDetails.submittedTo}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button
                  onClick={closeResult}
                  className="flex-1 py-4 rounded-2xl bg-accent-yellow text-black font-bold text-lg shadow-lg"
                >
                  Finish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
