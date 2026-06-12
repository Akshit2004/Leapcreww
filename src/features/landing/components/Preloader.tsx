"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";

export default function Preloader() {
  const [done, setDone] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || sessionStorage.getItem("lc_intro_seen")) return;

    setDone(false);
    document.body.style.overflow = "hidden";
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem("lc_intro_seen", "1");
        setTimeout(() => {
          setDone(true);
          document.body.style.overflow = "";
        }, 200);
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
          className="fixed inset-0 z-[100] bg-[#1D211F] flex flex-col items-center justify-center select-none"
          aria-hidden
        >
          <div className="flex items-center gap-3 mb-10">
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.1 }}
              className="w-11 h-11 rounded-md bg-[#FAF7F2]/10 border border-[#FAF7F2]/15 flex items-center justify-center"
            >
              <Bot className="w-6 h-6 text-[#FAF7F2]" />
            </motion.div>
            <div className="overflow-hidden">
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="block font-sans font-extrabold text-2xl tracking-tight text-[#FAF7F2]"
              >
                LeapCrew AI
              </motion.span>
            </div>
          </div>

          <div className="w-48 space-y-3">
            <div className="h-px bg-[#FAF7F2]/10 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-[#D05E3C]" style={{ width: `${count}%` }} />
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] tracking-widest uppercase">
              <span className="text-[#FAF7F2]/35">Initializing workspace</span>
              <span className="text-[#D05E3C] font-bold tabular-nums">{count}%</span>
            </div>
          </div>

          <div className="absolute bottom-10 font-mono text-[9px] tracking-widest text-[#FAF7F2]/25 uppercase">
            [ Conversational systems · architectural scale ]
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
