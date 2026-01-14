"use client";

import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { AnimatePresence, motion } from "framer-motion";
import { Image, Zap, ZapOff, X } from "lucide-react";

interface Result {
  match: boolean;
  item: string;
  confidence: number;
}

const base64ToFile = (dataUrl: string, filename: string) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const submitLostItem = async (
  imageBase64: string | null
): Promise<Result> => {
   if (!imageBase64) throw new Error("No image data");

   const file = base64ToFile(imageBase64, "capture.jpg");
   const fd = new FormData();
   fd.append("file", file);

   const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/search`, {
     method: "POST",
     body: fd,
   });
   return await res.json();
};

export default function Page() {
  const [openConfirm, setOpenConfirm] = useState(false);
  const [result, setResult] = useState<Result | null>(null);


  const [loading, setLoading] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false); // Track if video is playing
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false); // Flash is not supported in web API easily without more work

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ---------- CAMERA ---------- */
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
      setVideoReady(false); // Reset ready state
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
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
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
      setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // 1. Capture at full video resolution (likely 4:3 or 16:9 depending on device)
        // Or force 3:4 aspect ratio crop
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        
        // Target aspect ratio 3:4 (0.75)
        const targetRatio = 3/4;
        
        let cropW, cropH, cropX, cropY;

        // Determine crop area to maintain 3:4 ratio from the video stream center
        if (videoW / videoH > targetRatio) {
           // Video is wider than 3:4 (e.g. 16:9 or 4:3) -> crop width
           cropH = videoH;
           cropW = cropH * targetRatio;
           cropX = (videoW - cropW) / 2;
           cropY = 0;
        } else {
           // Video is taller than 3:4 (unlikely for webcam, but possible) -> crop height
           cropW = videoW;
           cropH = cropW / targetRatio;
           cropX = 0;
           cropY = (videoH - cropH) / 2;
        }

        canvas.width = cropW;
        canvas.height = cropH;
        
        const context = canvas.getContext('2d');
        if (context) {
            // Draw only the cropped region
            context.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
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
      setOpenConfirm(true);
    }
  };

  // Note: Flash control via getUserMedia - works on Android Chrome/WebView, limited on iOS
  const toggleFlash = async () => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      // Toggle torch logic using advanced constraints
      const newFlashState = !flashOn;
      
      // Need to cast to any because TS DOM types doesn't fully support 'torch' yet
      await track.applyConstraints({
        advanced: [{ torch: newFlashState } as any]
      });
      
      setFlashOn(newFlashState);
    } catch (err) {
      console.error("Error toggling flash:", err);
      // Fallback: If applyConstraints fails, it might mean torch is unsupported
    }
  };

  useEffect(() => {
    // No more transparent body needed!
    openCamera();
    return () => {
      stopCamera();
    };
  }, []);

  /* ---------- AI ---------- */
  const handleFormSubmission = async () => {
    setLoading(true);
    try {
      const data = await submitLostItem(imageBase64);
      setResult(data);
    } catch (error) {
       console.error("Submission error", error);
       // Handle match: false or error state if needed
    }
    setOpenConfirm(false); 
    setLoading(false);
  };

  const closeResult = () => {
    setResult(null);
    // setItemName("");
    // setDescription("");
    setImageBase64(null);
    startCamera();
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

      {/* CAMERA SECTION */}
      {!openConfirm && !result && (
        <div className="flex-1 flex flex-col relative w-full">
          {/* CAMERA INSTRUCTIONS */}
          <div className="w-full px-6 mb-4 z-20 relative">
            <div className="mx-auto max-w-md rounded-xl bg-black/60 backdrop-blur border border-border-custom px-4 py-3">
              <p className="text-sm font-medium text-foreground">A quick tip</p>
              <p className="text-sm text-secondary-text mt-1 leading-relaxed">
                Clear photos lead to better matches
              </p>
            </div>
          </div>

          {/* HIDDEN CANVAS FOR CAPTURE */}
          <canvas ref={canvasRef} className="hidden" />

          {/* HTML5 VIDEO ELEMENT */}
          <div className="relative w-full z-10 flex-1 flex flex-col justify-center items-center">
            <div
              className="relative overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] bg-card-bg rounded-3xl"
              style={{
                width: "100%",
                maxWidth: "600px",  // Increased max width
                aspectRatio: "4 / 5", // Between 1:1 and 3:4
              }}
            >
              {/* VIDEO */}
                <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted
                    onCanPlay={() => setVideoReady(true)}
                    className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${
                      videoReady ? "opacity-100" : "opacity-0"
                    }`}
                />
              
              {/* LOADING SPINNER (Visible when video not ready) */}
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-zinc-700 border-t-accent-yellow rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* CAMERA CONTROLS */}
          <div className="w-full py-8 flex justify-center items-center gap-12 z-20 bg-background mt-auto sticky bottom-0">
            <button
              onClick={uploadFromGallery}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-btn-bg border border-border-custom"
            >
              <Image size={20} />
            </button>

            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-accent-yellow bg-white"
            />

            <button
              onClick={toggleFlash}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition ${
                flashOn
                  ? "bg-accent-yellow/20 border-accent-yellow text-accent-yellow shadow-[0_0_12px_rgba(253,224,71,0.6)]"
                  : "bg-btn-bg border-border-custom text-secondary-text"
              }`}
            >
              {flashOn ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      <AnimatePresence>
        {openConfirm && imageBase64 && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
             {/* TOP BAR WITH CROSS ICON */}
             <div className="absolute top-10 left-6 z-10 p-2 bg-black/50 rounded-full backdrop-blur-md border border-white/10"
                  onClick={() => {
                    setOpenConfirm(false);
                    setImageBase64(null);
                    startCamera();
                  }}
             >
                <X size={24} className="text-white" />
             </div>

            <div className="flex-1 flex items-center justify-center pt-24">
              <img
                src={imageBase64}
                className="w-full aspect-[3/4] object-cover rounded-2xl"
              />
            </div>

            <div className="p-6">
              <h2 className="text-2xl font-semibold">
                Continue with this photo?
              </h2>
              <p className="text-sm text-secondary-text mt-2">
                Make sure the item is clearly visible.
              </p>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    setOpenConfirm(false);
                    setImageBase64(null);
                    startCamera();
                  }}
                  className="flex-1 py-3 rounded-lg border border-border-custom text-secondary-text hover:text-foreground"
                >
                  Retake
                </button>

                <button
                  onClick={handleFormSubmission}
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg bg-accent-yellow text-black font-semibold disabled:opacity-70"
                >
                  {loading ? "Analyzing..." : "Run AI Analysis"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULT */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              {result.match ? "Match found" : "No match yet"}
            </h2>

            <p className="text-secondary-text text-center mb-6">
              {result.match
                ? `We found a likely match for "${result.item}".`
                : `We couldn’t find a match for "${result.item}" yet.`}
            </p>

            <button
              onClick={closeResult}
              className="w-full max-w-sm py-4 rounded-lg bg-btn-bg hover:bg-btn-hover border border-border-custom"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
