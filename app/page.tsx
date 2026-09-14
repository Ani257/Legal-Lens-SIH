"use client";

import { Leaf, ScanLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Scanner from "@/components/Scanner";
import Results from "@/components/Results";
import type { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  return (
    <main className="grain phone-shell mx-auto min-h-[100dvh] w-full max-w-[480px] overflow-hidden bg-cream">
      <div className="safe-bottom px-5 pb-8 pt-7 sm:px-7">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between text-leaf">
            <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lime shadow-sm"><Leaf size={20} fill="currentColor" /></span><span className="text-xl font-black tracking-tight">LegalLens</span></div>
            {result && <button onClick={() => setResult(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-ink/65" aria-label="Scan another package"><ScanLine size={19} /></button>}
          </div>
          <AnimatePresence initial={false}>
          {!result && <motion.div key="intro" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className="mt-3 text-sm font-semibold text-ink/55">Eat smart. Pay fair. Know your food.</p>
            <h1 className="mt-8 text-[2rem] font-black leading-[1.08] tracking-[-.04em]">Scan a food package</h1>
            <p className="mt-3 text-base text-ink/60">Check the label, price and sugars.</p>
          </motion.div>}
          </AnimatePresence>
        </motion.header>
        {result ? <Results result={result} onReset={() => setResult(null)} /> : <Scanner onResult={setResult} />}
        <footer className="mt-10 text-center text-[11px] leading-relaxed text-ink/35">LegalLens helps you review visible package information. It does not provide legal or medical advice.</footer>
      </div>
    </main>
  );
}