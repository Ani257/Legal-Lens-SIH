"use client";

import { Leaf } from "lucide-react";
import { useState } from "react";
import Scanner from "@/components/Scanner";
import Results from "@/components/Results";
import type { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  return (
    <main className="phone-shell mx-auto min-h-screen w-full max-w-[480px] bg-cream">
      <div className="safe-bottom px-5 pb-8 pt-7 sm:px-7">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-leaf"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lime"><Leaf size={20} fill="currentColor" /></span><span className="text-xl font-black tracking-tight">LegalLens</span></div>
          {!result && <>
            <p className="mt-3 text-sm font-semibold text-ink/55">Eat smart. Pay fair. Know your food.</p>
            <h1 className="mt-8 text-[2rem] font-black leading-[1.08] tracking-[-.04em]">Scan a food package</h1>
            <p className="mt-3 text-base text-ink/60">Check the label, price and sugars.</p>
          </>}
        </header>
        {result ? <Results result={result} onReset={() => setResult(null)} /> : <Scanner onResult={setResult} />}
        <footer className="mt-10 text-center text-[11px] leading-relaxed text-ink/35">LegalLens helps you review visible package information. It does not provide legal or medical advice.</footer>
      </div>
    </main>
  );
}