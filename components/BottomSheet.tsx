"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export default function BottomSheet({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && <>
        <motion.button
          aria-label="Close details"
          className="fixed inset-0 z-40 cursor-default bg-ink/35 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.section
          role="dialog" aria-modal="true" aria-label={title}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] rounded-t-[30px] bg-cream shadow-2xl"
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 310 }}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-ink/15" />
          <header className="flex items-center justify-between px-6 pb-4 pt-4">
            <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
            <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink" aria-label="Close">
              <X size={20} />
            </button>
          </header>
          <div className="sheet-scroll safe-bottom px-6 pb-6">{children}</div>
        </motion.section>
      </>}
    </AnimatePresence>
  );
}