"use client";

import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import {
  NativeSettings,
  AndroidSettings,
  IOSSettings,
} from "capacitor-native-settings";
import {
  X,
  Zap,
  ZapOff,
  RotateCcw,
  Package,
  MapPin,
  Loader2,
} from "lucide-react";

/* ================= CONSTANTS ================= */

const DROP_LOCATIONS = [
  "Admin Block Reception",
  "Library Front Desk",
  "A Block Security",
  "B Block Auditorium",
];

/* ================= COMPONENT ================= */

export default function FoundPage() {
  const [itemFiles, setItemFiles] = useState<(string | null)[]>(
    Array(6).fill(null),
  );

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentShot, setCurrentShot] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [foundLocation, setFoundLocation] = useState("");
  const [submitLocation, setSubmitLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  /* ================= HELPERS ================= */

  const base64ToFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  /* ================= SUBMIT LOGIC ================= */

  const handleSubmit = async () => {
    const validBase64Strings = itemFiles.filter((f): f is string => !!f);

    // Validation
    if (
      !itemName ||
      !itemDescription ||
      !foundLocation ||
      !submitLocation ||
      validBase64Strings.length < 1
    ) {
      alert("Please fill all fields and add at least one photo");
      return;
    }

    setLoading(true);

    const formData = new FormData();

    // Appending all text fields for JSON storage on backend
    formData.append("item_name", itemName);
    formData.append("description", itemDescription);
    formData.append("found_location", foundLocation);
    formData.append("pickup_location", submitLocation);

    // Append images
    validBase64Strings.forEach((base64, index) => {
      const file = base64ToFile(base64, `item-${index}.jpg`);
      formData.append("files", file);
    });

    try {
      const res = await fetch(`${BACKEND_URL}/found`, {
        method: "POST",
        body: formData,
        // Note: Don't set Content-Type header when sending FormData,
        // the browser will set it automatically with the boundary.
      });

      if (!res.ok) throw new Error("Upload failed");

      alert("Item registered successfully and saved to storage!");

      // Reset Form
      setItemName("");
      setItemDescription("");
      setFoundLocation("");
      setSubmitLocation("");
      setItemFiles(Array(6).fill(null));
      setCurrentShot(0);
    } catch (error) {
      console.error(error);
      alert("Server error while uploading");
    } finally {
      setLoading(false);
    }
  };

  /* ================= CAMERA LOGIC ================= */

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initCamera = async () => {
      if (!isCameraOpen) return;
      setVideoReady(false);

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera error", err);
        setIsCameraOpen(false);
      }
    };

    if (isCameraOpen) {
      initCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraOpen]);

  const openCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      const status = await Camera.checkPermissions();
      if (status.camera !== "granted") {
        const req = await Camera.requestPermissions();
        if (req.camera !== "granted") {
          if (window.confirm("Camera permission required. Open settings?")) {
            await NativeSettings.open({
              optionAndroid: AndroidSettings.ApplicationDetails,
              optionIOS: IOSSettings.App,
            });
          }
          return;
        }
      }
    }
    setCurrentShot(itemFiles.filter(Boolean).length);
    setIsCameraOpen(true);
  };

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || currentShot >= 6) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const targetRatio = 3 / 4;

    const vidW = video.videoWidth;
    const vidH = video.videoHeight;
    let cropW, cropH, cropX, cropY;

    if (vidW / vidH > targetRatio) {
      cropH = vidH;
      cropW = cropH * targetRatio;
      cropX = (vidW - cropW) / 2;
      cropY = 0;
    } else {
      cropW = vidW;
      cropH = cropW / targetRatio;
      cropX = 0;
      cropY = (vidH - cropH) / 2;
    }

    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const base64 = canvas.toDataURL("image/jpeg", 0.9);

      setItemFiles((prev) => {
        const copy = [...prev];
        copy[currentShot] = base64;
        return copy;
      });

      if (currentShot === 5) {
        setTimeout(() => setIsCameraOpen(false), 300);
      } else {
        setCurrentShot((s) => s + 1);
      }
    }
  };

  return (
    <div className="min-h-screen relative bg-background text-foreground">
      <canvas ref={canvasRef} className="hidden" />

      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background pt-16">
          <div className="absolute top-0 left-0 right-0 px-4 pt-4 flex justify-between items-center z-20">
            <button
              onClick={() => setIsCameraOpen(false)}
              className="p-2 bg-card-bg/80 backdrop-blur-md rounded-full border border-border-custom text-foreground shadow-sm"
            >
              <X size={26} />
            </button>
            <button
              onClick={async () => {
                if (!videoRef.current?.srcObject) return;
                const track = (
                  videoRef.current.srcObject as MediaStream
                ).getVideoTracks()[0];
                try {
                  await track.applyConstraints({
                    advanced: [{ torch: !flashOn } as any],
                  });
                  setFlashOn(!flashOn);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="p-2 bg-card-bg/80 backdrop-blur-md rounded-full border border-border-custom text-foreground shadow-sm"
            >
              {flashOn ? (
                <Zap size={22} className="text-yellow-400 fill-current" />
              ) : (
                <ZapOff size={22} />
              )}
            </button>
          </div>

          <div className="relative mx-4 mt-2 aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-border-custom bg-card-bg">
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 size={48} className="animate-spin text-zinc-500" />
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlaying={() => setVideoReady(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${videoReady ? "opacity-100" : "opacity-0"}`}
            />
            <div
              className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ease-out ${isFlashing ? "opacity-100" : "opacity-0"}`}
            />
          </div>

          <div className="flex-1 flex flex-col justify-end pb-8 relative z-20">
            <div className="mb-6 text-center">
              <p className="text-sm font-medium text-foreground">
                Insert image {currentShot + 1} of 6
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${i < currentShot ? "bg-primary" : "bg-foreground/20"}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-12 pb-4">
              <button
                onClick={() => {
                  setItemFiles((prev) => {
                    const c = [...prev];
                    c[currentShot - 1] = null;
                    return c;
                  });
                  setCurrentShot((s) => s - 1);
                }}
                disabled={currentShot === 0}
                className="p-3 rounded-full bg-btn-bg text-foreground border border-border-custom shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw size={24} />
              </button>
              <button
                onClick={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center active:scale-95 transition-all bg-transparent"
              >
                <div className="w-16 h-16 rounded-full bg-foreground" />
              </button>
              <div className="w-[50px]"></div>
            </div>
          </div>
        </div>
      )}

      {!isCameraOpen && (
        <div className="px-4 pt-8 pb-28 space-y-8">
          <h1 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
            <Package className="text-primary" /> Report Found Item
          </h1>

          <div>
            <p className="text-sm mb-3 text-secondary-text">
              {itemFiles.filter(Boolean).length} of 6 photos added
            </p>
            <div className="grid grid-cols-3 gap-4">
              {itemFiles.map((img, i) => (
                <button
                  key={i}
                  onClick={openCamera}
                  className="aspect-square rounded-xl overflow-hidden relative flex items-center justify-center bg-card-bg border border-border-custom hover:border-primary/50 transition-colors"
                >
                  {img ? (
                    <img src={img} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-2xl text-secondary-text">+</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Item Name</h3>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Blue Wallet"
                className="w-full p-3 rounded-xl bg-card-bg border border-border-custom text-foreground outline-none focus:border-primary transition-colors"
                style={{ colorScheme: "dark light" }}
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Description</h3>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={3}
                placeholder="Details..."
                className="w-full p-3 rounded-xl bg-card-bg border border-border-custom text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Where did you find it?</h3>
              <input
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
                placeholder="Location"
                className="w-full p-3 rounded-xl bg-card-bg border border-border-custom text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Submit to</h3>
              <div className="grid gap-2">
                {DROP_LOCATIONS.map((loc) => (
                  <label
                    key={loc}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${submitLocation === loc ? "border-primary bg-primary/10" : "border-border-custom bg-card-bg text-foreground"}`}
                  >
                    <input
                      type="radio"
                      checked={submitLocation === loc}
                      onChange={() => setSubmitLocation(loc)}
                      className="hidden"
                    />
                    <MapPin
                      size={16}
                      className={
                        submitLocation === loc
                          ? "text-primary"
                          : "text-secondary-text"
                      }
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !itemName || !submitLocation}
            className={`w-full py-4 rounded-2xl font-bold transition shadow-lg ${loading ? "bg-zinc-700" : "bg-primary hover:brightness-110 active:scale-[0.98]"} text-white`}
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
