"use client";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useVelocity,
  useSpring,
  useTransform,
  useMotionValue,
  useAnimationFrame,
} from "framer-motion";

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

function VelocityRow({
  text,
  baseVelocity,
  outline = false,
}: {
  text: string;
  baseVelocity: number;
  outline?: boolean;
}) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });
  const directionFactor = useRef(baseVelocity > 0 ? 1 : -1);
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    let moveBy = directionFactor.current * Math.abs(baseVelocity) * (delta / 1000);
    const vf = velocityFactor.get();
    if (vf < 0) directionFactor.current = baseVelocity > 0 ? -1 : 1;
    else if (vf > 0) directionFactor.current = baseVelocity > 0 ? 1 : -1;
    moveBy += directionFactor.current * moveBy * Math.abs(vf);
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="overflow-hidden whitespace-nowrap flex">
      <motion.div style={{ x }} className="flex whitespace-nowrap will-change-transform">
        {[...Array(4)].map((_, i) => (
          <span
            key={i}
            className={`font-serif font-light text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight pr-8 select-none ${
              outline ? "text-stroke-ink" : "text-[#1D211F]"
            }`}
          >
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function KineticBand() {
  return (
    <section
      aria-hidden
      className="py-16 md:py-24 bg-[#F1EBE0] border-b border-[#1D211F]/8 overflow-hidden space-y-2 md:space-y-4"
    >
      <VelocityRow text="Recover Carts · Confirm COD · Rescue NDR · " baseVelocity={1.6} />
      <VelocityRow text="Attribute Every Rupee · " baseVelocity={-1.6} outline />
    </section>
  );
}
