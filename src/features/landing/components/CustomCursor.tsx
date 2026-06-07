"use client";
import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my, tx = mx, ty = my;
    let raf: number;

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const tick = () => {
      cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
      tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06;
      if (ref.current) ref.current.style.transform = `translate3d(${cx - 14}px,${cy - 14}px,0)`;
      if (trailRef.current) trailRef.current.style.transform = `translate3d(${tx - 80}px,${ty - 80}px,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", onMove); };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={trailRef} aria-hidden className="pointer-events-none fixed top-0 left-0 z-[60] w-40 h-40 rounded-full"
        style={{ background: "radial-gradient(circle at center,rgba(208,94,60,0.18) 0%,rgba(208,94,60,0) 65%)", mixBlendMode: "multiply", willChange: "transform" }} />
      <div ref={ref} aria-hidden className="pointer-events-none fixed top-0 left-0 z-[61] w-7 h-7 rounded-full border border-[#1D211F] mix-blend-difference"
        style={{ willChange: "transform" }} />
    </>
  );
}
