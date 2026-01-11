"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import {
  NativeSettings,
  AndroidSettings,
  IOSSettings,
} from "capacitor-native-settings";
import {
  CameraPreview,
  CameraPreviewOptions,
} from "@capacitor-community/camera-preview";
import {
  ArrowLeft,
  Zap,
  ZapOff,
  RotateCcw,
  Package,
  MapPin,
} from "lucide-react";

/* ================= THEME ================= */

const THEME = {
  bg: "#000000",
  textPrimary: "#FFFFFF",
  textSecondary: "#B0B0B0",
  blue: "#007BFF",
  red: "#FF3B30",
  yellow: "#FFD60A",
  buttonBg: "#1C1C1E",
  buttonHover: "#2C2C2E",
  border: "#3A3A3C",
};

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
  const [cameraRunning, setCameraRunning] = useState(false);
  const [currentShot, setCurrentShot] = useState(0);
  const [flashOn, setFlashOn] = useState(false);

  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [foundLocation, setFoundLocation] = useState("");
  const [submitLocation, setSubmitLocation] = useState("");

  /* ================= PERMISSIONS ================= */

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
    if (!isCameraOpen) return;

    const startCamera = async () => {
      if (!Capacitor.isNativePlatform()) return;

      const screenWidth = window.innerWidth;
      const cameraHeight = Math.floor(screenWidth * (4 / 3));
      const topOffset = Math.floor(
        (window.innerHeight - cameraHeight) / 2 -
          window.innerHeight * 0.05 // push camera slightly up
      );

      await CameraPreview.stop().catch(() => {});

      const options: CameraPreviewOptions = {
        position: "rear",
        parent: "camera-preview",
        toBack: false,
        width: screenWidth,
        height: cameraHeight,
        x: 0,
        y: topOffset,
      };

      await CameraPreview.start(options);
      setCameraRunning(true);
    };

    startCamera();

    return () => {
      CameraPreview.stop().catch(() => {});
      setCameraRunning(false);
    };
  }, [isCameraOpen]);

  /* ================= CAMERA ACTIONS ================= */

  const openCamera = async () => {
    if (!Capacitor.isNativePlatform()) return;

    const permission = await ensureCameraPermission();
    if (permission === "granted") {
      setCurrentShot(itemFiles.filter(Boolean).length);
      setIsCameraOpen(true);
      return;
    }

    if (
      window.confirm(
        "Camera permission is required.\nOpen system settings?"
      )
    ) {
      await openSystemSettings();
    }
  };

  const closeCamera = () => setIsCameraOpen(false);

  const takePhoto = async () => {
    if (!cameraRunning || currentShot >= 6) return;

    const result = await CameraPreview.capture({ quality: 90 });
    const base64 = `data:image/jpeg;base64,${result.value}`;

    setItemFiles((prev) => {
      const copy = [...prev];
      copy[currentShot] = base64;
      return copy;
    });

    // auto close after 6th photo
    if (currentShot === 5) {
      setTimeout(() => {
        setIsCameraOpen(false);
      }, 300);
    } else {
      setCurrentShot((s) => s + 1);
    }
  };

  const retakeLast = () => {
    if (!cameraRunning || currentShot === 0) return;

    setItemFiles((prev) => {
      const copy = [...prev];
      copy[currentShot - 1] = null;
      return copy;
    });

    setCurrentShot((s) => s - 1);
  };

  const toggleFlash = async () => {
    if (!cameraRunning) return;
    const next = !flashOn;
    setFlashOn(next);
    await CameraPreview.setFlashMode({
      flashMode: next ? "on" : "off",
    });
  };

  const handleSubmit = () => {
    alert("Report Item submitted (wire backend here)");
  };

  const photosAdded = itemFiles.filter(Boolean).length;

  /* ================= UI ================= */

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: THEME.bg, color: THEME.textPrimary }}
    >
      {/* CAMERA PREVIEW */}
      {isCameraOpen && (
        <div id="camera-preview" className="absolute inset-0" />
      )}

      {/* CAMERA UI */}
      {isCameraOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end px-4 pb-8 pointer-events-none">
          {/* TOP BAR */}
          <div className="absolute top-0 left-0 right-0 px-4 pt-4 flex justify-between items-center pointer-events-auto">
            <button onClick={closeCamera}>
              <ArrowLeft size={26} />
            </button>
            <button onClick={toggleFlash}>
              {flashOn ? <Zap size={22} /> : <ZapOff size={22} />}
            </button>
          </div>

          {/* INFO BELOW CAMERA */}
          <div className="mb-6 text-center pointer-events-none">
            <p className="text-sm font-medium">
              Insert image {currentShot + 1} of 6
            </p>
            <p
              className="text-xs mt-1 px-6"
              style={{ color: THEME.textSecondary }}
            >
              Take photos in a clear environment from different angles
              for the best results
            </p>

            {/* PROGRESS DOTS */}
            <div className="mt-3 flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      i < currentShot ? THEME.blue : THEME.border,
                  }}
                />
              ))}
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center justify-center gap-12 pointer-events-auto">
            <button
              onClick={retakeLast}
              disabled={currentShot === 0}
              style={{ opacity: currentShot === 0 ? 0.4 : 1 }}
            >
              <RotateCcw size={26} />
            </button>

            <button
              onClick={takePhoto}
              className="w-20 h-20 rounded-full"
              style={{
                border: `6px solid ${THEME.yellow}`,
                backgroundColor: THEME.textPrimary,
              }}
            />

            <div className="w-6" />
          </div>
        </div>
      )}

      {/* FORM */}
      {!isCameraOpen && (
        <div className="px-4 pt-8 pb-28 space-y-8">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Package color={THEME.blue} />
            Report Found Item
          </h1>

          {/* PHOTO GRID */}
          <div>
            <p className="text-sm mb-3" style={{ color: THEME.textSecondary }}>
              {photosAdded} of 6 photos added
            </p>

            <div className="grid grid-cols-3 gap-4">
              {itemFiles.map((img, i) => (
                <button
                  key={i}
                  onClick={openCamera}
                  className="aspect-square rounded-xl overflow-hidden relative flex items-center justify-center"
                  style={{
                    backgroundColor: THEME.buttonBg,
                    border: `1px solid ${THEME.border}`,
                  }}
                >
                  {img ? (
                    <>
                      <img
                        src={img}
                        className="object-cover w-full h-full"
                      />
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ backgroundColor: THEME.blue }}
                      >
                        ✓
                      </div>
                    </>
                  ) : (
                    <span
                      className="text-2xl"
                      style={{ color: THEME.textSecondary }}
                    >
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
            <p
              className="text-sm"
              style={{ color: THEME.textSecondary }}
            >
              Help us identify the item clearly
            </p>

            <div
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: THEME.buttonBg,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <input
                placeholder="e.g. Black wallet, AirPods case"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Tell us more about it
            </h3>
            <p
              className="text-sm"
              style={{ color: THEME.textSecondary }}
            >
              Any details that could help the owner
            </p>

            <div
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: THEME.buttonBg,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <textarea
                rows={4}
                placeholder="Color, brand, scratches, stickers"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="w-full bg-transparent outline-none resize-none"
              />
            </div>
          </div>

          {/* LOCATION */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Where did you find it?
            </h3>
            <p
              className="text-sm"
              style={{ color: THEME.textSecondary }}
            >
              Be as specific as you can
            </p>

            <div
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: THEME.buttonBg,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <input
                placeholder="e.g. Library 2nd floor, near stairs"
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          {/* DROP LOCATION */}
          <div className="space-y-2">
            {DROP_LOCATIONS.map((loc) => (
              <label
                key={loc}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                style={{
                  backgroundColor:
                    submitLocation === loc
                      ? "rgba(0,123,255,0.15)"
                      : THEME.buttonBg,
                  border: `1px solid ${
                    submitLocation === loc
                      ? THEME.blue
                      : THEME.border
                  }`,
                }}
              >
                <input
                  type="radio"
                  checked={submitLocation === loc}
                  onChange={() => setSubmitLocation(loc)}
                />
                <MapPin size={16} />
                <span>{loc}</span>
              </label>
            ))}
          </div>

          {/* REPORT BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={
              photosAdded < 6 ||
              !itemName ||
              !itemDescription ||
              !foundLocation ||
              !submitLocation
            }
            className="w-full py-4 rounded-2xl text-lg font-semibold transition"
            style={{
              backgroundColor:
                photosAdded === 6 ? THEME.blue : THEME.buttonBg,
              color:
                photosAdded === 6
                  ? THEME.textPrimary
                  : THEME.textSecondary,
              border: `1px solid ${THEME.border}`,
            }}
          >
            Report Item
          </button>
        </div>
      )}
    </div>
  );
}
