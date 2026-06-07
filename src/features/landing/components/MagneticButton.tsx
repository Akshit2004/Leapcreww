"use client";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface MagneticButtonProps {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  testid?: string;
  target?: string;
  rel?: string;
  strength?: number;
}

export default function MagneticButton({ href, onClick, className = "", children, testid, target, rel, strength = 0.35 }: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.6 });
  const innerX = useTransform(sx, (v) => v * 0.55);
  const innerY = useTransform(sy, (v) => v * 0.55);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  if (href) {
    return (
      <motion.a ref={ref} href={href} target={target} rel={rel} data-testid={testid}
        onMouseMove={onMove} onMouseLeave={onLeave}
        style={{ x: sx, y: sy }}
        className={`inline-flex ${className}`}>
        <motion.span style={{ x: innerX, y: innerY }} className="inline-flex items-center justify-center gap-2 w-full">{children}</motion.span>
      </motion.a>
    );
  }
  return (
    <motion.button ref={ref} onClick={onClick} data-testid={testid}
      onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={`inline-flex ${className}`}>
      <motion.span style={{ x: innerX, y: innerY }} className="inline-flex items-center justify-center gap-2 w-full">{children}</motion.span>
    </motion.button>
  );
}
