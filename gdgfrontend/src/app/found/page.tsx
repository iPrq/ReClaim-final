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
  "College Security Office",
  "Library Front Desk",
  "Main Administration Block",
  "Hostel Warden Office",
];

/* ================= COMPONENT ================= */

export default function FoundPage() {
  const [itemFiles, setItemFiles] = useState<(string | null)[]>(
    Array(6).fill(null)
  );

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentShot, setCurrentShot] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false); // Visual feedback state

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [foundLocation, setFoundLocation] = useState("");
  const [submitLocation, setSubmitLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  /* ================= PERMISSIONS ================= */

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

  const handleSubmit = async () => {
    const validBase64Strings = itemFiles.filter((f): f is string => !!f);

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
    formData.append("item_name", itemName);

    // formData.append("description", itemDescription);
    // formData.append("found_location", foundLocation);
    // formData.append("pickup_location", submitLocation);

    validBase64Strings.forEach((base64, index) => {
      const file = base64ToFile(base64, `item-${index}.jpg`);
      formData.append("files", file);
    });

    try {
      const res = await fetch(`${BACKEND_URL}/found`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      alert("Item registered successfully");
      setItemName("");
      setItemDescription("");
      setFoundLocation("");
      setSubmitLocation("");
      setItemFiles(Array(6).fill(null));
    } catch {
      alert("Server error while uploading");
    } finally {
      setLoading(false);
    }
  };

  const ensureCameraPermission = async (): Promise<
    "granted" | "blocked"
  > => {
    const status = await Camera.checkPermissions();
    if (status.camera === "granted") return "granted";

    const req = await Camera.requestPermissions({
      permissions: ["camera"],
    });

    return req.camera === "granted" ? "granted" : "blocked";
  };

  const openSystemSettings = async () => {
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    });
  };

  /* ================= CAMERA ================= */

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
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraOpen]);

  /* ================= CAMERA ACTIONS ================= */

  const openCamera = async () => {
    // Native permission check if wrapper is used, otherwise browser handles it
    if (Capacitor.isNativePlatform()) {
      const status = await Camera.checkPermissions();
      if (status.camera !== "granted") {
        const req = await Camera.requestPermissions();
        if (req.camera !== "granted") {
           // Optionally ask to open settings
           if(window.confirm("Camera permission required. Open settings?")) {
              await openSystemSettings();
           }
           return;
        }
      }
    }

    setCurrentShot(itemFiles.filter(Boolean).length);
    setIsCameraOpen(true);
  };

  const closeCamera = () => setIsCameraOpen(false);

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || currentShot >= 6) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Explicit 3:4 Aspect Ratio Capture
    const vidW = video.videoWidth;
    const vidH = video.videoHeight;
    const targetRatio = 3 / 4; 
    
    let cropW, cropH, cropX, cropY;

    // Determine crop area to maintain 3:4 ratio from the center
    if (vidW / vidH > targetRatio) {
       // Video is wider than 3:4 -> crop excess width
       cropH = vidH; 
       cropW = cropH * targetRatio;
       cropX = (vidW - cropW) / 2;
       cropY = 0;
    } else {
       // Video is taller than 3:4 -> crop excess height
       cropW = vidW;
       cropH = cropW / targetRatio;
       cropX = 0;
       cropY = (vidH - cropH) / 2;
    }
    
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if(ctx) {
        // Visual feedback
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

  const retakeLast = () => {
    if (currentShot === 0) return;
    setItemFiles((prev) => {
      const copy = [...prev];
      copy[currentShot - 1] = null;
      return copy;
    });
    setCurrentShot((s) => s - 1);
  };

  const toggleFlash = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const track = (videoRef.current.srcObject as MediaStream).getVideoTracks()[0];
    try {
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
        setFlashOn(!flashOn);
    } catch(e) {
        console.error("Flash error", e);
    }
  };



  const photosAdded = itemFiles.filter(Boolean).length;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen relative bg-background text-foreground">
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

      {/* CAMERA OVERLAY - Z-60 to hide NavBar */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black pt-16">
            
            {/* TOP BAR - MOVED OUT OF VIDEO */}
            <div className="absolute top-0 left-0 right-0 px-4 pt-4 flex justify-between items-center z-20">
                <button onClick={closeCamera} className="p-2 bg-zinc-900/50 backdrop-blur-md rounded-full border border-white/10">
                  <X size={26} />
                </button>
                <button onClick={toggleFlash} className="p-2 bg-zinc-900/50 backdrop-blur-md rounded-full border border-white/10">
                  {flashOn ? <Zap size={22} className="text-yellow-400 fill-current" /> : <ZapOff size={22} />}
                </button>
            </div>

           {/* VIDEO CONTAINER - Rounded & Aspect Ratio */}
           <div className="relative mx-4 mt-2 aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-zinc-800 bg-zinc-900">
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
                    className={`w-full h-full object-cover transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* FLASH OVERLAY */}
                <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ease-out ${isFlashing ? 'opacity-100' : 'opacity-0'}`} />
           </div>

           {/* CONTROLS BELOW */}
           <div className="flex-1 flex flex-col justify-end pb-8 relative z-20">
              {/* INFO */}
              <div className="mb-6 text-center">
                <p className="text-sm font-medium">
                  Insert image {currentShot + 1} of 6
                </p>
                <p className="text-xs mt-1 px-6 text-zinc-400">
                  Take photos in a clear environment from different angles
                </p>
                
                {/* PROGRESS DOTS */}
                <div className="mt-3 flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        i < currentShot ? "bg-accent-blue" : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-center gap-12 pb-4">
                 <button
                   onClick={retakeLast}
                   disabled={currentShot === 0}
                   style={{ opacity: currentShot === 0 ? 0 : 1 }}
                   className="p-3 rounded-full bg-zinc-800 text-zinc-300 transition-opacity"
                 >
                    <RotateCcw size={24} />
                 </button>

                 <button
                    onClick={takePhoto}
                    className="w-20 h-20 rounded-full border-4 border-[#FFD60A] flex items-center justify-center active:scale-95 transition-transform"
                 >
                     <div className="w-16 h-16 rounded-full bg-white"/>
                 </button>
                 
                 <div className="w-[50px]"></div> {/* Spacer */}
              </div>
           </div>
        </div>
      )}

      {/* FORM */}
      {!isCameraOpen && (
        <div className="px-4 pt-8 pb-28 space-y-8">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="text-accent-blue" />
            Report Found Item
          </h1>

          {/* PHOTO GRID */}
          <div>
            <p className="text-sm mb-3 text-secondary-text">
              {photosAdded} of 6 photos added
            </p>

            <div className="grid grid-cols-3 gap-4">
              {itemFiles.map((img, i) => (
                <button
                  key={i}
                  onClick={openCamera}
                  className="aspect-square rounded-xl overflow-hidden relative flex items-center justify-center bg-btn-bg border border-border-custom"
                >
                  {img ? (
                    <>
                      <img
                        src={img}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-accent-blue text-white">
                        ✓
                      </div>
                    </>
                  ) : (
                    <span className="text-2xl text-secondary-text">
                      +
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ITEM NAME */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              What did you find?
            </h3>
            <p className="text-sm text-secondary-text">
              Help us identify the item clearly
            </p>

            <div className="rounded-2xl px-4 py-3 bg-btn-bg border border-border-custom">
              <input
                placeholder="e.g. Black wallet, AirPods case"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-transparent outline-none text-foreground placeholder:text-secondary-text"
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Tell us more about it
            </h3>
            <p className="text-sm text-secondary-text">
              Any details that could help the owner
            </p>

            <div className="rounded-2xl px-4 py-3 bg-btn-bg border border-border-custom">
              <textarea
                rows={4}
                placeholder="Color, brand, scratches, stickers"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="w-full bg-transparent outline-none resize-none text-foreground placeholder:text-secondary-text"
              />
            </div>
          </div>

          {/* LOCATION */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Where did you find it?
            </h3>
            <p className="text-sm text-secondary-text">
              Be as specific as you can
            </p>

            <div className="rounded-2xl px-4 py-3 bg-btn-bg border border-border-custom">
              <input
                placeholder="e.g. Library 2nd floor, near stairs"
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
                className="w-full bg-transparent outline-none text-foreground placeholder:text-secondary-text"
              />
            </div>
          </div>

          {/* DROP LOCATION */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Drop Locations
            </h3>
            <p className="text-sm text-secondary-text">
              Please submit the item to one of these verified locations
            </p>

            <div className="pt-2 flex flex-col gap-2">
              {DROP_LOCATIONS.map((loc) => (
                <label
                  key={loc}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors border ${
                    submitLocation === loc
                      ? "bg-accent-blue/15 border-accent-blue"
                      : "bg-btn-bg border-border-custom"
                  }`}
                >
                  <input
                    type="radio"
                    checked={submitLocation === loc}
                    onChange={() => setSubmitLocation(loc)}
                    className="accent-accent-blue"
                  />
                  <MapPin size={16} />
                  <span>{loc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* REPORT BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={
              photosAdded < 6 ||
              !itemName ||
              !itemDescription ||
              !foundLocation ||
              !submitLocation ||
              loading
            }
            className={`w-full py-4 rounded-2xl text-lg font-semibold transition flex items-center justify-center border ${
              photosAdded === 6
                ? "bg-accent-blue text-white border-accent-blue"
                : "bg-btn-bg text-secondary-text border-border-custom"
            } ${loading ? "opacity-70" : ""}`}
          >
            {loading ? "Submitting..." : "Report Item"}
          </button>
        </div>
      )}
    </div>
  );
}
