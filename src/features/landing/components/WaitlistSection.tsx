"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

const ORDER_BANDS = [
  { value: "<500", label: "Under 500" },
  { value: "500-2000", label: "500 – 2,000" },
  { value: "2000-10000", label: "2,000 – 10,000" },
  { value: "10000+", label: "10,000+" },
];

const PERKS = [
  "50% off for the first 6 months",
  "Direct WhatsApp line to the founder",
  "Migration help from your current tool",
  "Your feature requests, prioritised",
];

export default function WaitlistSection({ source = "landing" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [brandName, setBrandName] = useState("");
  const [monthlyOrders, setMonthlyOrders] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, brandName, monthlyOrders, source }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <section id="waitlist" className="py-24 md:py-32 px-6 md:px-12 bg-[#F1EBE0] border-b border-[#1D211F]/8 relative overflow-hidden scroll-mt-20">
      <div aria-hidden className="absolute -top-24 right-0 w-96 h-96 rounded-full bg-[#D05E3C]/10 blur-3xl" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start relative">
        {/* ── Left: the offer ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="lg:col-span-6 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D05E3C]/25 bg-[#D05E3C]/5">
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Limited · Pre-Launch</span>
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.08] text-[#1D211F]">
            Join the <span className="italic font-normal text-[#2E4A3F]">Founding&nbsp;50.</span>
          </h2>
          <p className="text-[#1D211F]/65 text-sm sm:text-base leading-relaxed font-medium max-w-md">
            We&rsquo;re onboarding exactly fifty D2C brands at launch — few enough that every one gets real attention. In exchange for your feedback, you get terms we&rsquo;ll never offer again.
          </p>
          <ul className="space-y-3 pt-2">
            {PERKS.map((perk, i) => (
              <motion.li
                key={perk}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-3 text-sm font-medium text-[#1D211F]/80"
              >
                <span className="w-5 h-5 rounded-full bg-[#2E4A3F] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[#FAF7F2]" strokeWidth={3} />
                </span>
                {perk}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* ── Right: the form ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="lg:col-span-6"
        >
          <div className="bg-white border border-[#1D211F]/12 p-6 sm:p-10">
            <AnimatePresence mode="wait">
              {status === "done" ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center space-y-4"
                >
                  <div className="w-14 h-14 rounded-full bg-[#2E4A3F] flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 text-[#FAF7F2]" strokeWidth={3} />
                  </div>
                  <h3 className="font-serif text-2xl font-light text-[#1D211F]">You&rsquo;re on the list.</h3>
                  <p className="text-[#1D211F]/60 text-sm font-medium max-w-sm mx-auto">
                    We&rsquo;ll reach out personally before launch. Keep an eye on your inbox — Founding 50 invites go out in order of signup.
                  </p>
                </motion.div>
              ) : (
                <motion.form key="form" exit={{ opacity: 0, scale: 0.98 }} onSubmit={submit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="wl-email" className="font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">Work email *</label>
                    <input
                      id="wl-email" type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="founder@yourbrand.in"
                      className="w-full border border-[#1D211F]/15 bg-[#FAF7F2] px-4 py-3.5 text-sm font-medium text-[#1D211F] placeholder:text-[#1D211F]/30 focus:outline-none focus:border-[#2E4A3F] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="wl-brand" className="font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">Brand name</label>
                    <input
                      id="wl-brand" type="text" value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Your D2C brand"
                      className="w-full border border-[#1D211F]/15 bg-[#FAF7F2] px-4 py-3.5 text-sm font-medium text-[#1D211F] placeholder:text-[#1D211F]/30 focus:outline-none focus:border-[#2E4A3F] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">Monthly orders</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ORDER_BANDS.map((band) => (
                        <button
                          key={band.value} type="button"
                          onClick={() => setMonthlyOrders(band.value)}
                          className={`px-2 py-2.5 border text-[11px] font-bold tracking-wide transition-colors ${
                            monthlyOrders === band.value
                              ? "bg-[#1D211F] text-[#FAF7F2] border-[#1D211F]"
                              : "bg-[#FAF7F2] text-[#1D211F]/70 border-[#1D211F]/15 hover:border-[#1D211F]/40"
                          }`}
                        >
                          {band.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* honeypot — invisible to humans */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

                  {status === "error" && (
                    <p className="text-xs font-bold text-red-600">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="group w-full bg-[#D05E3C] hover:bg-[#b04826] disabled:opacity-60 text-white font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>{status === "loading" ? "Securing your spot…" : "Claim a Founding 50 spot"}</span>
                    {status !== "loading" && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>
                  <p className="font-mono text-[8px] tracking-widest text-[#1D211F]/35 uppercase text-center">No spam. One pre-launch email, one invite. That&rsquo;s it.</p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
