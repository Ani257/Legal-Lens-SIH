"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Apple, BadgeIndianRupee, Check, ChevronRight, CircleAlert, Flag, RotateCcw, Scale, X } from "lucide-react";
import { useState } from "react";
import BottomSheet from "./BottomSheet";
import type { AnalysisResult, CheckStatus } from "@/lib/types";

type Sheet = "nutrition" | "label" | "price" | null;

const statusUI: Record<CheckStatus, { icon: typeof Check; label: string; color: string; bg: string }> = {
  COMPLIANT: { icon: Check, label: "Looks good", color: "text-leaf", bg: "bg-green-50" },
  UNVERIFIED: { icon: AlertTriangle, label: "Needs checking", color: "text-amber-700", bg: "bg-amber-50" },
  NON_COMPLIANT: { icon: X, label: "Potential issue", color: "text-red-700", bg: "bg-red-50" }
};

export default function Results({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const looksGood = result.overall === "LEGAL";
  const unavailable = result.checks.some(check => check.status === "UNVERIFIED");
  const cards = [
    { id: "nutrition" as const, title: "Nutrition & Sugars", subtitle: `${result.sugars.length} sugar ingredient${result.sugars.length === 1 ? "" : "s"} noticed`, icon: Apple, tone: "bg-[#FFF1DC]" },
    { id: "label" as const, title: "Label Check", subtitle: `${result.checks.filter(c => c.status === "COMPLIANT").length} of ${result.checks.length} checks look good`, icon: Scale, tone: "bg-[#E9F3D0]" },
    { id: "price" as const, title: "True Price", subtitle: result.price.calculated, icon: BadgeIndianRupee, tone: "bg-[#E4F1EB]" }
  ];
  const issue = result.checks.find(check => check.status !== "COMPLIANT")?.explanation || "A potential packaging compliance issue was detected.";
  const mail = `mailto:helpline@nch.in?subject=${encodeURIComponent(`Potential packaging issue: ${result.extraction.product_name}`)}&body=${encodeURIComponent(`Product: ${result.extraction.product_name}\nLegalLens result: ${result.overall}\nPotential issue: ${issue}\n\nA potential packaging compliance issue was detected. Please review the package independently.`)}`;

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className={`rounded-[30px] p-6 ${looksGood ? "bg-gradient-to-br from-leaf to-[#174831] text-white" : "bg-gradient-to-br from-amber-100 to-peach text-ink"}`}>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${looksGood ? "bg-white/15" : "bg-white/55"}`}>
          {looksGood ? <Check size={26} /> : <CircleAlert size={26} />}
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] opacity-70">{result.overall}</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{looksGood ? "Looks Good" : "Needs a Closer Look"}</h2>
        {unavailable && <p className="mt-3 text-sm font-medium opacity-80">Some details could not be verified from this photo.</p>}
      </div>

      <div className="px-1">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-ink/45">Your product</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">{result.extraction.product_name}</h1>
        <p className="mt-1 text-sm font-medium text-ink/60">{result.extraction.brand_or_manufacturer}</p>
      </div>

      <div className="space-y-3">
        {cards.map(({ id, title, subtitle, icon: Icon, tone }) => (
          <button key={id} onClick={() => setSheet(id)} className={`flex min-h-[88px] w-full items-center gap-4 rounded-[24px] ${tone} p-4 text-left transition active:scale-[.98]`}>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/75"><Icon size={23} /></span>
            <span className="min-w-0 flex-1"><span className="block font-extrabold">{title}</span><span className="mt-1 block truncate text-sm text-ink/60">{subtitle}</span></span>
            <ChevronRight size={20} className="text-ink/35" />
          </button>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <a href={mail} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 font-extrabold text-red-800"><Flag size={19} />Report a Potential Issue</a>
        <button onClick={onReset} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 font-extrabold text-white"><RotateCcw size={19} />Scan Another Package</button>
      </div>

      <BottomSheet open={sheet === "nutrition"} title="Nutrition & Sugars" onClose={() => setSheet(null)}>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries({
            Energy: result.extraction.nutrition.energy,
            Protein: result.extraction.nutrition.protein,
            "Total Sugars": result.extraction.nutrition.total_sugars,
            Sodium: result.extraction.nutrition.sodium
          }).map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-4"><p className="text-xs font-bold text-ink/45">{label}</p><p className="mt-2 text-sm font-extrabold">{value}</p></div>)}
        </div>
        <h3 className="mb-3 mt-7 text-lg font-extrabold">Sugars to Notice</h3>
        {result.sugars.length ? <div className="space-y-3">{result.sugars.map(sugar => <div key={sugar.name} className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-extrabold">{sugar.name}</p><p className="mt-1 text-sm leading-relaxed text-ink/65">{sugar.explanation}</p></div>)}</div> :
          <p className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-ink/65">None of the common added-sugar ingredients we checked for were clearly identified.</p>}
      </BottomSheet>

      <BottomSheet open={sheet === "label"} title="Label Check" onClose={() => setSheet(null)}>
        <div className="space-y-3">{result.checks.map(check => {
          const ui = statusUI[check.status]; const Icon = ui.icon;
          return <div key={check.key} className={`rounded-2xl ${ui.bg} p-4`}>
            <div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-full bg-white ${ui.color}`}><Icon size={18} /></span><div><p className="font-extrabold">{check.label}</p><p className={`text-xs font-bold ${ui.color}`}>{ui.label}</p></div></div>
            <p className="mt-3 text-sm leading-relaxed text-ink/65">{check.explanation}</p>
          </div>;
        })}</div>
      </BottomSheet>

      <BottomSheet open={sheet === "price"} title="True Price" onClose={() => setSheet(null)}>
        <p className="text-sm leading-relaxed text-ink/65">We calculate the price per gram or ml ourselves so you can compare products fairly.</p>
        {result.price.amount !== undefined && result.price.quantity !== undefined ? <div className="my-6 flex items-center justify-between gap-2 rounded-2xl bg-ink p-5 text-center text-white">
          <span><b className="block text-lg">₹{result.price.amount}</b><small className="text-white/55">MRP</small></span>
          <span className="text-white/40">÷</span>
          <span><b className="block text-lg">{result.price.quantity} {result.price.normalizedUnit}</b><small className="text-white/55">Quantity</small></span>
          <span className="text-white/40">=</span>
          <b className="text-lg text-lime">{result.price.calculated}</b>
        </div> : <p className="my-5 rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">Not enough information to calculate this.</p>}
        <div className="space-y-2">
          {[["MRP", result.price.mrp], ["Net quantity", result.price.netQuantity], ["Declared unit price", result.price.declared], ["Calculated unit price", result.price.calculated], ["Difference", result.price.difference]].map(([label, value]) =>
            <div key={label} className="flex items-start justify-between gap-4 border-b border-ink/10 py-3 text-sm"><span className="text-ink/55">{label}</span><b className="text-right">{value}</b></div>)}
        </div>
        <p className={`mt-5 rounded-2xl p-4 text-sm font-extrabold ${result.price.state === "MATCH" ? "bg-green-50 text-leaf" : result.price.state === "DIFFERENT" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
          {result.price.state === "MATCH" ? "Your package price matches the calculation." : result.price.state === "DIFFERENT" ? "Price difference detected." : "Not enough information to fully verify this."}
        </p>
      </BottomSheet>
    </motion.div>
  );
}