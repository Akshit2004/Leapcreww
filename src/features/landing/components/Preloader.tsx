"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LEDGER = ["Recover carts", "Confirm COD", "Rescue NDR", "Attribute every rupee"];

export default function Preloader() {
  const [done, setDone] = useState(true);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || sessionStorage.getItem("lc_intro_seen")) return;

    setDone(false);
    document.body.style.overflow = "hidden";
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * 100));
      setStep(Math.min(LEDGER.length - 1, Math.floor(eased * LEDGER.length)));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem("lc_intro_seen", "1");
        setTimeout(() => {
          setDone(true);
          document.body.style.overflow = "";
        }, 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ y: "-100%" }}
          transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] bg-[#1D211F] flex flex-col items-center justify-center select-none overflow-hidden"
          aria-hidden
        >
          <div className="absolute inset-0 grain-overlay opacity-[0.06]" />

          <div className="absolute top-8 left-8 right-8 flex items-center justify-between font-mono text-[9px] tracking-widest text-[#FAF7F2]/30 uppercase">
            <span>LeapCrew AI</span>
            <span className="tabular-nums">{String(count).padStart(2, "0")} / 100</span>
          </div>

          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="font-serif text-5xl sm:text-6xl font-light tracking-tight text-[#FAF7F2]"
            >
              Leap<span className="italic font-normal text-[#D05E3C]">Crew</span>
            </motion.h1>
          </div>

          <div className="w-64 space-y-3">
            <div className="h-px bg-[#FAF7F2]/10 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-[#D05E3C]"
                animate={{ width: `${count}%` }}
                transition={{ ease: "linear", duration: 0.1 }}
              />
            </div>
            <div className="h-4 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={step}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 font-mono text-[9px] tracking-widest text-[#FAF7F2]/40 uppercase"
                >
                  {LEDGER[step]}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          <div className="absolute bottom-8 font-mono text-[9px] tracking-widest text-[#FAF7F2]/20 uppercase">
            Building your workspace
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
