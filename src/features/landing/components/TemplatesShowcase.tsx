"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, MousePointerClick } from "lucide-react";

const INDUSTRIES = [
  { key: "ecommerce", label: "🛒 E-commerce" },
  { key: "finance",   label: "💰 Finance" },
  { key: "healthcare",label: "🏥 Healthcare" },
  { key: "travel",    label: "✈️ Travel" },
  { key: "hr",        label: "👥 HR" },
  { key: "education", label: "🎓 Education" },
];

const TEMPLATES: Record<string, { name: string; body: string; buttons?: string[]; category: string }[]> = {
  ecommerce: [
    { name: "Order Confirmed", body: "Hi {{1}}! 🎉 Your order #{{2}} has been confirmed.\n\nTotal: ₹{{3}}\nEstimated delivery: {{4}}\n\nTrack your order anytime on our website.", buttons: ["Track Order", "Contact Support"], category: "Utility" },
    { name: "Cart Recovery", body: "Hey {{1}}, you left something behind! 🛍️\n\nYour cart worth ₹{{2}} is waiting. Complete your purchase in the next 2 hours and get FREE shipping.\n\nOffer expires soon!", buttons: ["Complete Purchase"], category: "Marketing" },
    { name: "Price Drop Alert", body: "Great news, {{1}}! 🔥\n\nThe {{2}} you wishlisted just dropped from ₹{{3}} to ₹{{4}} — that's {{5}}% off!\n\nStock is limited. Grab it before it's gone.", buttons: ["Shop Now", "View Wishlist"], category: "Marketing" },
  ],
  finance: [
    { name: "EMI Reminder", body: "Dear {{1}},\n\nThis is a reminder that your EMI of ₹{{2}} for loan account {{3}} is due on {{4}}.\n\nPay on time to avoid penalty charges. Thank you for banking with us.", buttons: ["Pay Now", "View Details"], category: "Utility" },
    { name: "Transaction Alert", body: "Alert: ₹{{1}} debited from your account {{2}} on {{3}} at {{4}}.\n\nAvailable balance: ₹{{5}}\n\nNot you? Report immediately.", buttons: ["Report Transaction"], category: "Utility" },
  ],
  healthcare: [
    { name: "Appointment Confirmed", body: "Hello {{1}},\n\nYour appointment with Dr. {{2}} is confirmed for {{3}} at {{4}}.\n\n📍 {{5}}\n\nPlease arrive 10 minutes early. Bring your previous reports if any.", buttons: ["Add to Calendar", "Reschedule"], category: "Utility" },
    { name: "Lab Report Ready", body: "Hi {{1}},\n\nYour lab reports for {{2}} are ready. You can collect them from the reception or download them via the link below.\n\nReport Date: {{3}}", buttons: ["Download Report"], category: "Utility" },
  ],
  travel: [
    { name: "Flight Reminder", body: "✈️ Bon voyage, {{1}}!\n\nYour flight {{2}} departs in 24 hours.\n\nDeparture: {{3}} at {{4}}\nArrival: {{5}} at {{6}}\nPNR: {{7}}\n\nCheck-in opens now!", buttons: ["Web Check-In", "View Booking"], category: "Utility" },
    { name: "Hotel Booking Confirmed", body: "Your stay is confirmed! 🏨\n\nHotel: {{1}}\nCheck-in: {{2}}\nCheck-out: {{3}}\nGuests: {{4}}\n\nPIN code: {{5}}. Show this at reception.", buttons: ["View Directions"], category: "Utility" },
  ],
  hr: [
    { name: "Offer Letter Sent", body: "Congratulations, {{1}}! 🎊\n\nWe're thrilled to extend you an offer for the role of {{2}} at {{3}}.\n\nPlease review and sign your offer letter by {{4}}.\n\nWelcome to the team!", buttons: ["Sign Offer Letter"], category: "Utility" },
    { name: "Payslip Ready", body: "Hi {{1}},\n\nYour payslip for {{2}} is now available.\n\nNet Pay: ₹{{3}}\nCredit Date: {{4}}\n\nFor any queries, contact HR.", buttons: ["Download Payslip"], category: "Utility" },
  ],
  education: [
    { name: "Exam Reminder", body: "📚 Exam Alert, {{1}}!\n\n{{2}} exam is scheduled for {{3}} at {{4}}.\n\nVenue: {{5}}\nRoll No: {{6}}\n\nBest of luck! The faculty is rooting for you.", buttons: ["View Timetable"], category: "Utility" },
    { name: "Fee Reminder", body: "Dear Parent of {{1}},\n\nThe fee of ₹{{2}} for {{3}} is due by {{4}}.\n\nPay online to avail a ₹{{5}} early payment discount.\n\nKindly ignore if already paid.", buttons: ["Pay Now", "Receipt"], category: "Utility" },
  ],
};

const CATEGORY_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Marketing: { text: "#0891b2", bg: "#e0f2fe", border: "#0891b2" },
  Utility:   { text: "#7c3aed", bg: "#ede9fe", border: "#7c3aed" },
};

function WaBubble({ name, body, buttons, category }: { name: string; body: string; buttons?: string[]; category: string }) {
  const cat = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.Utility;
  const vars = ["Rahul", "ORD-8821", "₹1,249", "26 Jun", "₹12,500", "SBI0009823"];
  let display = body;
  vars.forEach((v, i) => { display = display.replace(`{{${i + 1}}}`, v); });

  return (
    <div className="bg-white border border-[#1D211F]/8 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1D211F]/6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#2E4A3F] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">B</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#1D211F] leading-none">Your Business</p>
            <p className="text-[9px] text-[#1D211F]/40 mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Online</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ color: cat.text, background: cat.bg, borderColor: cat.border + "66" }}>{category}</span>
      </div>
      {/* Bubble */}
      <div className="p-4">
        <p className="text-[10px] text-[#1D211F]/50 font-mono uppercase tracking-widest mb-2">{name}</p>
        <div className="bg-[#dcf8c6] rounded-xl rounded-tl-sm p-3 text-xs text-[#1D211F] leading-relaxed whitespace-pre-wrap shadow-sm">
          {display}
        </div>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[9px] text-[#1D211F]/30">11:42 AM</span>
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
        </div>
        {buttons && buttons.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {buttons.map((btn) => (
              <div key={btn} className="border border-[#53bdeb] text-[#0a7abf] bg-white text-[11px] font-semibold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5">
                <MousePointerClick className="w-3 h-3" />{btn}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TemplatesShowcase() {
  const [active, setActive] = useState("ecommerce");
  const items = TEMPLATES[active] ?? [];

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8 scroll-mt-20">
      {/* Heading */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ Template Library ]</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
            150+ industry templates, <span className="italic font-normal text-[#2E4A3F] shimmer-underline">ready to send.</span>
          </h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-7 pt-2 lg:pt-8 space-y-4">
          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed font-medium">
            Every template is pre-mapped to Meta's compliance checklist. Our AI Auditor flags issues before submission — keeping approval rates near 100%.
          </p>
          <div className="flex flex-wrap gap-2">
            {["E-commerce", "Healthcare", "Finance", "Travel", "HR", "Education", "Restaurant", "Real Estate"].map((tag) => (
              <span key={tag} className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 border border-[#1D211F]/12 rounded-full text-[#1D211F]/55 font-bold">{tag}</span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Industry tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {INDUSTRIES.map((ind) => (
          <button key={ind.key} onClick={() => setActive(ind.key)}
            className={`px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${active === ind.key ? "bg-[#1D211F] text-[#FAF7F2] border-[#1D211F]" : "border-[#1D211F]/15 text-[#1D211F]/60 hover:border-[#1D211F]/40 bg-white"}`}>
            {ind.label}
          </button>
        ))}
      </div>

      {/* Template cards */}
      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <WaBubble {...t} />
            </motion.div>
          ))}

          {/* CTA card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: items.length * 0.07 }}
            className="border border-dashed border-[#1D211F]/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center bg-[#FAF7F2] hover:border-[#1D211F]/40 transition-all group">
            <div className="w-12 h-12 rounded-full bg-[#1D211F]/6 flex items-center justify-center group-hover:bg-[#1D211F]/10 transition-colors">
              <Clock className="w-5 h-5 text-[#1D211F]/40" />
            </div>
            <div>
              <p className="font-serif text-xl font-light text-[#1D211F]">+ 150 more</p>
              <p className="text-xs text-[#1D211F]/50 mt-1">All included. No add-on pricing.</p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
