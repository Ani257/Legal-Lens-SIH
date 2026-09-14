"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { sampleResult } from "@/lib/sample";

const loadingMessages = [
  "Looking at the package...",
  "Reading the label...",
  "Checking the price...",
  "Checking nutrition & sugars...",
  "Preparing your results..."
];

const MAX_COMPRESSED_BYTES = 1_250_000;
const REQUEST_TIMEOUT_MS = 35_000;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("This photo could not be prepared. Please choose another one.")),
      "image/jpeg",
      quality
    );
  });
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.split(",")[1];
      base64 ? resolve(base64) : reject(new Error("This photo could not be prepared. Please choose another one."));
    };
    reader.onerror = () => reject(new Error("This photo could not be read. Please choose another one."));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<{ image: string; mimeType: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a valid image.");
  if (file.size > 15 * 1024 * 1024) throw new Error("This image is too large. Please choose one under 15 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This photo format is not supported. Please use a JPG, PNG or WebP photo.");
  }
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This photo could not be prepared. Please choose another one.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > MAX_COMPRESSED_BYTES && quality > 0.55) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }
  if (blob.size > MAX_COMPRESSED_BYTES) {
    throw new Error("This photo is still too large after resizing. Please take a closer photo of the label.");
  }
  return { image: await blobToBase64(blob), mimeType: "image/jpeg" };
}

export default function Scanner({ onResult }: { onResult: (result: AnalysisResult) => void }) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setMessageIndex(index => Math.min(index + 1, loadingMessages.length - 1)), 1700);
    return () => clearInterval(interval);
  }, [loading]);

  function chooseFile(selected?: File) {
    setError("");
    if (!selected) return;
    if (!selected.type.startsWith("image/")) { setError("Please choose a valid image."); return; }
    if (selected.size > 15 * 1024 * 1024) { setError("This image is too large. Please choose one under 15 MB."); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function scan() {
    if (!file || loading) return;
    setLoading(true); setError(""); setMessageIndex(0);
    let timeout: number | undefined;
    try {
      const payload = await compressImage(file);
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal
      });
      const responseText = await response.text();
      let data: { error?: string } & Partial<AnalysisResult>;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("The scan service returned an unexpected response. Please try again.");
      }
      if (!response.ok) throw new Error(data.error || "Something went wrong while reading this package.");
      onResult(data as AnalysisResult);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setError("Reading the package took too long. Please try again when your connection is stable.");
      } else if (reason instanceof TypeError) {
        setError("We could not reach the scan service. Check your connection and try again.");
      } else {
        setError(reason instanceof Error ? reason.message : "Something went wrong while reading this package.");
      }
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  if (preview) return (
    <div className="space-y-5">
      <div className="scan-frame relative aspect-[4/5] overflow-hidden rounded-[30px] bg-ink shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Selected package" className={`h-full w-full object-cover transition ${loading ? "opacity-45" : ""}`} />
        {loading && <>
          <motion.div className="absolute inset-x-5 z-10 h-0.5 bg-lime shadow-[0_0_18px_4px_rgba(223,242,176,.7)]"
            animate={{ top: reduceMotion ? "50%" : ["12%", "88%", "12%"] }} transition={{ duration: 2.4, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }} />
          <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-ink/80 px-5 py-4 text-left text-sm font-bold text-white backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 text-lime"><Sparkles size={15} /><span className="text-[10px] uppercase tracking-[.18em] text-white/60">One careful read</span></div>
            {loadingMessages[messageIndex]}
            <div className="mt-3 flex gap-1">{loadingMessages.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= messageIndex ? "bg-lime" : "bg-white/20"}`} />)}</div>
          </div>
        </>}
      </div>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-bold">Something went wrong while reading this package.</p><p className="mt-1">{error}</p>
      </div>}
      <button disabled={loading} onClick={scan} className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-leaf px-5 font-extrabold text-white shadow-lg shadow-leaf/20 disabled:opacity-60">
        {error ? <RotateCcw size={20} /> : <Sparkles size={20} />}{error ? "Try Again" : "Scan This Package"}
      </button>
      <button disabled={loading} onClick={() => inputRef.current?.click()} className="pressable min-h-12 w-full rounded-2xl font-bold text-leaf disabled:opacity-50">Choose Another Photo</button>
      <input ref={inputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => chooseFile(event.target.files?.[0])} />
    </div>
  );

  return (
    <div className="space-y-6">
      <button onClick={() => inputRef.current?.click()} className="pressable group relative block aspect-[4/3] w-full overflow-hidden rounded-[32px] bg-gradient-to-br from-leaf to-[#173F2D] p-6 text-left text-white shadow-soft" aria-label="Choose a package photo">
        <span className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" aria-hidden="true" />
        <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" aria-hidden="true" />
        <motion.span
          className="absolute inset-x-7 z-10 h-px bg-gradient-to-r from-transparent via-lime/70 to-transparent"
          animate={{ top: reduceMotion ? "50%" : ["18%", "82%", "18%"], opacity: reduceMotion ? .35 : [.25, .75, .25] }}
          transition={{ duration: 4.5, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
        <span className="absolute left-5 top-5 h-8 w-8 border-l-2 border-t-2 border-lime" />
        <span className="absolute right-5 top-5 h-8 w-8 border-r-2 border-t-2 border-lime" />
        <span className="absolute bottom-5 left-5 h-8 w-8 border-b-2 border-l-2 border-lime" />
        <span className="absolute bottom-5 right-5 h-8 w-8 border-b-2 border-r-2 border-lime" />
        <div className="grid h-full place-items-center text-center">
          <div>
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 transition group-active:scale-95"><Camera size={34} /></span>
            <span className="mt-5 block text-xl font-extrabold">Scan Package</span>
            <span className="mt-1 block text-sm text-white/70">Tap to take or choose a photo</span>
          </div>
        </div>
      </button>
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
      <input ref={inputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => chooseFile(event.target.files?.[0])} />
       <button onClick={() => onResult(sampleResult)} className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white/65 px-4 text-sm font-bold text-ink/70">
        <ImagePlus size={18} />Try a Sample Scan
      </button>
    </div>
  );
}