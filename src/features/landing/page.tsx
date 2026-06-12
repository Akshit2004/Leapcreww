"use client";

import Preloader from "./components/Preloader";
import ScrollProgress from "./components/ScrollProgress";
import CustomCursor from "./components/CustomCursor";
import KineticBand from "./components/KineticBand";
import Header from "./components/Header";
import Hero from "./components/Hero";
import MessageMarquee from "./components/MessageMarquee";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Stats from "./components/Stats";
import DeveloperPlatform from "./components/DeveloperPlatform";
import TrustedBy from "./components/TrustedBy";
import Pricing from "./components/Pricing";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
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
      <MessageMarquee />
      <Features />
      <HowItWorks />
      <Stats />
      <KineticBand />
      <DeveloperPlatform />
      <TrustedBy />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}
