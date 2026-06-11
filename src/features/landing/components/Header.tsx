"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Developers", href: "#developers" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#FAF7F2]/85 backdrop-blur-xl border-b border-[#1D211F]/8" : "bg-transparent border-b border-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-md bg-[#1D211F] flex items-center justify-center overflow-hidden">
            <Bot className="w-5 h-5 text-[#FAF7F2] relative z-10" />
            <div className="absolute inset-0 bg-[#D05E3C] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
          </div>
          <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">WappFlow</span>
        </a>

        <nav className="max-md:hidden md:flex items-center gap-8 lg:gap-10">
          {navItems.map((it) => (
            <a key={it.label} href={it.href} className="relative text-xs font-semibold tracking-wider text-[#1D211F]/60 hover:text-[#1D211F] transition-colors uppercase group">
              {it.label}
              <span className="absolute left-0 right-0 -bottom-1 h-px bg-[#D05E3C] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="max-sm:hidden text-xs font-bold tracking-wider text-[#1D211F]/60 hover:text-[#1D211F] px-3 py-2.5 rounded-md transition-colors uppercase">Sign In</Link>
          <Link href="/signup" className="magnetic-cta bg-[#1D211F] hover:bg-[#2E4A3F] text-[#FAF7F2] font-semibold text-xs tracking-wider uppercase px-4 sm:px-5 py-3 rounded-md flex items-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all">
            <span>Get Started</span><ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button className="md:hidden p-2 -mr-2 text-[#1D211F]" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="w-5 h-5" /></button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden fixed inset-0 z-50 bg-[#FAF7F2]">
            <div className="flex items-center justify-between px-6 h-20 border-b border-[#1D211F]/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#1D211F] flex items-center justify-center"><Bot className="w-5 h-5 text-[#FAF7F2]" /></div>
                <span className="font-sans font-extrabold text-xl text-[#1D211F]">WappFlow</span>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="w-6 h-6 text-[#1D211F]" /></button>
            </div>
            <nav className="flex flex-col p-6 gap-1">
              {navItems.map((it, i) => (
                <motion.a key={it.label} href={it.href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.1 }} onClick={() => setMobileOpen(false)} className="font-serif text-3xl font-light py-3 border-b border-[#1D211F]/8 text-[#1D211F]">
                  {it.label}
                </motion.a>
              ))}
              <Link href="/signup" onClick={() => setMobileOpen(false)} className="mt-8 bg-[#1D211F] text-[#FAF7F2] text-center py-4 rounded-md font-bold text-xs tracking-wider uppercase">Register Workspace</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
