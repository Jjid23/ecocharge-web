import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Sparkles, CheckCircle2, RefreshCw, Play, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BottleSize, DetectionResult } from '../types';
import { analyzeBottleImageYolo, detectAndAwardBottle } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CameraDetectorProps {
  onSuccess: (result: { bottleSize: BottleSize; pointsEarned: number; bottleType: string }) => void;
  onNavigateCharging: () => void;
}

export const CameraDetector: React.FC<CameraDetectorProps> = ({ onSuccess, onNavigateCharging }) => {
  const { user, refreshUserData } = useAuth();
  const [cameraActive, setCameraActive]       = useState(false);
  const [scanning, setScanning]               = useState(false);
  const [cameraError, setCameraError]         = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);

  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Camera helpers (useCallback so useEffect can depend on them) ───────────

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    // Check if permission is permanently blocked before even trying
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (perm.state === 'denied') {
          setCameraError(
            'Camera permission is blocked. Click the 🔒 lock in the address bar → ' +
            'Site settings → Camera → Allow, then refresh the page.'
          );
          return;
        }
      } catch { /* browser may not support this */ }
    }

    // Try 1: rear camera (mobile)
    // Try 2: any camera (PC webcam / laptop)
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 720 }, height: { ideal: 1280 } } },
      { video: { width: { ideal: 720 }, height: { ideal: 480 } } },
      { video: true },
    ];

    for (const constraint of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
          setCameraError(null);
          return; // success — stop trying
        }
      } catch (err: any) {
        const name = err?.name ?? '';
        // Only stop retrying for hard errors
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Camera access was denied. Click the 🔒 lock in the address bar → ' +
            'Camera → Allow, then tap Retry.'
          );
          return;
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.');
          return;
        }
        // OverconstrainedError / NotReadableError → try next constraint
        console.warn(`[Camera] ${name} with constraint, trying fallback...`);
      }
    }

    // All constraints failed
    setCameraError(
      'Could not start camera. Make sure no other app is using it, then tap Retry.'
    );
  }, []);

  // ── Auto-start on mount, stop on unmount ───────────────────────────────────
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── Capture a JPEG frame from the live video ───────────────────────────────

  const captureFrame = (): string | null => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    // Use native video resolution — don't downscale, model needs full detail
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Send at maximum quality — v2.pt needs full detail to detect at low confidence
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // ── Scan: capture → YOLO → award points ───────────────────────────────────

  const handleScanNow = async () => {
    if (!user) return;
    setCameraError(null);

    const base64 = captureFrame();
    if (!base64) {
      setCameraError('Could not capture a frame. Make sure the camera is active.');
      return;
    }

    setScanning(true);
    setDetectionResult(null);

    try {
      const aiRes = await analyzeBottleImageYolo(base64);

      if (!aiRes || aiRes.confidence === 0 || aiRes.detectedLabel === 'none') {
        setCameraError('No bottle detected. Hold the bottle clearly in frame and try again.');
        setScanning(false);
        return;
      }

      const finalLabel = aiRes.detectedLabel ?? aiRes.bottleSize;
      const finalCat   = aiRes.bottleSize;
      const bottleType = aiRes.bottleType;
      const confidence = aiRes.confidence;

      // Award points using the already-detected label — no need to re-send the image
      const res = await detectAndAwardBottle({
        userId:    user.userId,
        bottleSize: finalCat,
        quantity:   1,
        bottleType,
        // imageData intentionally omitted — YOLO already ran above
      });

      setDetectionResult({
        bottleSize:     finalCat,
        bottleType,
        confidence,
        pointsEarned:   res.earnedPoints,
        detectedAt:     new Date().toLocaleTimeString(),
        detectedLabel:  finalLabel,
        dimensionsText: `${finalLabel} · ${finalCat.toUpperCase()}`,
      });

      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      await refreshUserData();
      onSuccess({ bottleSize: finalCat, pointsEarned: res.earnedPoints, bottleType });
    } catch (err: any) {
      console.error('Detection error:', err);
      const msg = err?.message ?? 'Unknown error';
      setCameraError(`Detection failed: ${msg}. Check console for details.`);
    } finally {
      setScanning(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Viewfinder ─────────────────────────────────────── */}
      <div
        className="relative bg-emerald-950 rounded-2xl overflow-hidden border-2 border-dashed border-emerald-700/60"
        style={{ aspectRatio: '3/4' }}
      >
        {/* Live video feed */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          autoPlay
          playsInline
          muted
        />

        {/* Placeholder shown while waiting / on error */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center">
              <Camera className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white">
              {cameraError ? 'Camera Blocked' : 'Starting Camera…'}
            </div>
            <div className="text-xs text-emerald-300/80 max-w-[260px] leading-relaxed">
              {cameraError
                ? cameraError
                : 'Waiting for camera permission…'}
            </div>
            {cameraError && (
              <>
                <button
                  onClick={startCamera}
                  className="mt-1 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform"
                >
                  <Play className="w-4 h-4 fill-current" /> Retry Camera
                </button>
                <div className="text-[10px] text-emerald-400/60 max-w-[240px]">
                  Still blocked? Open a new tab → paste{' '}
                  <span className="text-amber-300 font-mono">chrome://settings/content/camera</span>
                  {' '}and allow this site.
                </div>
              </>
            )}
          </div>
        )}

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <div className="absolute w-full h-0.5 bg-gradient-to-r from-emerald-500 via-teal-300 to-amber-400 shadow-[0_0_15px_#10b981] animate-pulse top-1/2" />
            <div className="bg-emerald-900/90 text-white px-5 py-3 rounded-xl border border-emerald-500/80 flex items-center gap-2 shadow-2xl z-10">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="font-bold text-sm">YOLO Analyzing…</span>
            </div>
          </div>
        )}

        {/* Error banner inside viewfinder */}
        {cameraError && cameraActive && (
          <div className="absolute bottom-2 left-2 right-2 bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs p-2.5 rounded-xl flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Corner guide lines */}
        {cameraActive && !scanning && (
          <>
            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-md pointer-events-none" />
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-md pointer-events-none" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-md pointer-events-none" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-md pointer-events-none" />
          </>
        )}

        {/* Stop button */}
        {cameraActive && !scanning && (
          <button
            onClick={stopCamera}
            className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-700/60 text-rose-300 text-xs font-bold"
          >
            Stop
          </button>
        )}
      </div>

      {/* ── Scan button (full width, no Qty) ───────────────── */}
      <button
        id="scan-bottle-btn"
        onClick={handleScanNow}
        disabled={scanning || !cameraActive}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 text-emerald-950 text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
      >
        <Sparkles className="w-4 h-4" />
        {scanning ? 'Scanning…' : 'Scan & Deposit'}
      </button>

      {/* ── Detection result card ───────────────────────────── */}
      {detectionResult && (
        <div
          id="detection-success-card"
          className="bg-gradient-to-br from-emerald-900 via-teal-950 to-emerald-950 border-2 border-emerald-400/80 rounded-2xl p-5 shadow-2xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 text-emerald-950 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="text-base font-black text-white">Bottle Detected!</div>
              <div className="text-xs text-emerald-300">{detectionResult.detectedAt}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Earned</div>
              <div className="text-xl font-black text-amber-300">+{detectionResult.pointsEarned} PTS</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Detected Size', val: detectionResult.detectedLabel ?? detectionResult.bottleSize, cls: 'font-mono text-emerald-300' },
              { label: 'Category',      val: detectionResult.bottleSize,                                   cls: 'capitalize' },
              { label: 'Confidence',    val: `${Math.round(detectionResult.confidence * 100)}%`,           cls: 'text-teal-300' },
              { label: 'New Balance',   val: `${user?.currentPoints} PTS`,                                 cls: 'text-amber-300' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800">
                <div className="text-[10px] uppercase font-semibold text-emerald-400">{label}</div>
                <div className={`text-sm font-bold text-white truncate ${cls}`}>{val}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              id="continue-to-charging-btn"
              onClick={onNavigateCharging}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4 fill-current" /> Continue to Charging
            </button>
            <button
              id="scan-another-bottle-btn"
              onClick={() => { setDetectionResult(null); setCameraError(null); }}
              className="w-full py-3 rounded-2xl bg-emerald-900/80 border border-emerald-700 text-emerald-200 font-bold text-sm active:scale-95 transition-transform"
            >
              Scan Another Bottle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
