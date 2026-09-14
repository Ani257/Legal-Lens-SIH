"use client";

import { motion } from "framer-motion";
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

async function compressImage(file: File): Promise<{ image: string; mimeType: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a valid image.");
  if (file.size > 15 * 1024 * 1024) throw new Error("This image is too large. Please choose one under 15 MB.");
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { image: canvas.toDataURL("image/jpeg", 0.84).split(",")[1], mimeType: "image/jpeg" };
}

export default function Scanner({ onResult }: { onResult: (result: AnalysisResult) => void }) {
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
    try {
      const payload = await compressImage(file);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong while reading this package.");
      onResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong while reading this package.");
    } finally { setLoading(false); }
  }

  if (preview) return (
    <div className="space-y-5">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[30px] bg-ink shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Selected package" className={`h-full w-full object-cover transition ${loading ? "opacity-45" : ""}`} />
        {loading && <>
          <motion.div className="absolute inset-x-5 h-0.5 bg-lime shadow-[0_0_18px_4px_rgba(223,242,176,.7)]"
            animate={{ top: ["12%", "88%", "12%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
          <div className="absolute inset-x-6 bottom-7 rounded-2xl bg-ink/80 px-5 py-4 text-center text-sm font-bold text-white backdrop-blur">
            {loadingMessages[messageIndex]}
          </div>
        </>}
      </div>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-bold">Something went wrong while reading this package.</p><p className="mt-1">{error}</p>
      </div>}
      <button disabled={loading} onClick={scan} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-leaf px-5 font-extrabold text-white shadow-lg shadow-leaf/20 disabled:opacity-60">
        {error ? <RotateCcw size={20} /> : <Sparkles size={20} />}{error ? "Try Again" : "Scan This Package"}
      </button>
      <button disabled={loading} onClick={() => inputRef.current?.click()} className="min-h-12 w-full rounded-2xl font-bold text-leaf disabled:opacity-50">Choose Another Photo</button>
      <input ref={inputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => chooseFile(event.target.files?.[0])} />
    </div>
  );

  return (
    <div className="space-y-6">
      <button onClick={() => inputRef.current?.click()} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[32px] bg-gradient-to-br from-leaf to-[#173F2D] p-6 text-left text-white shadow-soft" aria-label="Choose a package photo">
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
      <button onClick={() => onResult(sampleResult)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white/65 px-4 text-sm font-bold text-ink/70">
        <ImagePlus size={18} />Try a Sample Scan
      </button>
    </div>
  );
}