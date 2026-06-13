import type { Metadata } from "next";
import Header from "@/features/landing/components/Header";
import Footer from "@/features/landing/components/Footer";
import RevenueLeakCalculator from "@/features/landing/components/RevenueLeakCalculator";
import WaitlistSection from "@/features/landing/components/WaitlistSection";

export const metadata: Metadata = {
  title: "Revenue Leak Calculator — How much is your D2C brand losing? | LeapCrew",
  description:
    "Abandoned carts and COD returns silently drain Indian D2C brands every month. Drag three sliders and see the rupee figure your brand is leaking — and how much WhatsApp automation can claw back.",
  openGraph: {
    title: "How much revenue is your D2C brand leaking every month?",
    description:
      "Abandoned carts + COD RTO = a number most founders never calculate. Take 20 seconds and see yours.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How much revenue is your D2C brand leaking every month?",
    description:
      "Abandoned carts + COD RTO = a number most founders never calculate. Take 20 seconds and see yours.",
  },
};

export default function CalculatorPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans relative grain-overlay overflow-x-hidden">
      <Header />

      {/* Intro band */}
      <section className="pt-36 pb-4 md:pt-44 px-6 md:px-12 max-w-7xl mx-auto w-full text-center space-y-5">
        <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Free Tool · 20 Seconds · No Signup</span>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.08] max-w-3xl mx-auto">
          The number most founders <span className="italic font-normal text-[#D05E3C]">never calculate.</span>
        </h1>
        <p className="text-[#1D211F]/65 text-sm sm:text-base leading-relaxed font-medium max-w-xl mx-auto">
          Every month, abandoned carts walk away and unconfirmed COD orders bounce back as RTO. Three sliders, one honest estimate of what that costs your brand.
        </p>
      </section>

      <RevenueLeakCalculator />
      <WaitlistSection source="calculator" />
      <Footer />
    </main>
  );
}
