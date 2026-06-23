"use client";

import Preloader from "./components/Preloader";
import ScrollProgress from "./components/ScrollProgress";
import CustomCursor from "./components/CustomCursor";
import Header from "./components/Header";
import Hero from "./components/Hero";
import TrustedBy from "./components/TrustedBy";
import Features from "./components/Features";
import ProductTeaser from "./components/ProductTeaser";
import Pricing from "./components/Pricing";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans relative grain-overlay overflow-x-hidden">
      <Preloader />
      <ScrollProgress />
      <CustomCursor />
      <Header />
      <Hero />
      <TrustedBy />
      <Features />
      <ProductTeaser />
      <Pricing />
      <CTASection />
      <Footer />
    </main>
  );
}
