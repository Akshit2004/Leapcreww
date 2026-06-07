"use client";
import { useRef } from "react";
import { motion, useMotionValue, useMotionTemplate, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  max?: number;
  testid?: string;
}

export default function TiltCard({ children, className = "", max = 7, testid }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const smx = useSpring(mx, { stiffness: 220, damping: 20 });
  const smy = useSpring(my, { stiffness: 220, damping: 20 });
  const rotateY = useTransform(smx, [0, 1], [-max, max]);
  const rotateX = useTransform(smy, [0, 1], [max, -max]);
  const glowX = useTransform(smx, [0, 1], ["0%", "100%"]);
  const glowY = useTransform(smy, [0, 1], ["0%", "100%"]);
  const background = useMotionTemplate`radial-gradient(280px circle at ${glowX} ${glowY}, rgba(208,94,60,0.15), transparent 55%)`;

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className={`relative ${className}`} data-testid={testid}>
      {children}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-lg opacity-50"
        style={{ background }} />
    </motion.div>
  );
}
