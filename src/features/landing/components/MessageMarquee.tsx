"use client";
import { MessageSquare, Megaphone, Bot, Webhook, ShieldCheck, Network, Boxes, Zap, type LucideIcon } from "lucide-react";

const messages: { type: string; text: string; icon: LucideIcon }[] = [
  { type: "in", text: "Hey, my checkout failed — can you help?", icon: MessageSquare },
  { type: "out", text: "Broadcast 'fall-sale-24' dispatched to 12,480 contacts.", icon: Megaphone },
  { type: "bot", text: "Routing user → segment(vip) → trigger(welcome-flow)", icon: Bot },
  { type: "hook", text: "Shopify webhook order/created → status 200 OK", icon: Webhook },
  { type: "sec", text: "Meta template 'subscription_renew' approved.", icon: ShieldCheck },
  { type: "net", text: "Sync 3,420 contacts pulled from PostgreSQL cluster.", icon: Network },
  { type: "in", text: "When does my refund process complete?", icon: MessageSquare },
  { type: "out", text: "CTR 41.2% across 3 segmented campaigns this week.", icon: Megaphone },
  { type: "bot", text: "Autoresponder reply generated in 220ms.", icon: Bot },
  { type: "hook", text: "WooCommerce abandoned cart → sequence enrolled.", icon: Webhook },
  { type: "sec", text: "API key rotated. Last used: 12 seconds ago.", icon: ShieldCheck },
  { type: "net", text: "Webhook sub 'order.placed' signed with HMAC-SHA256.", icon: Network },
  { type: "ext", text: "Catalog sync: 824 products pulled from Meta Commerce.", icon: Boxes },
  { type: "ext", text: "Flow 'feedback-collect' published to Meta sandbox.", icon: Zap },
];

const colorByType: Record<string, string> = {
  in: "text-[#D05E3C]", out: "text-emerald-400", bot: "text-amber-400",
  hook: "text-[#FAF7F2]", sec: "text-emerald-300", net: "text-[#D05E3C]", ext: "text-amber-300",
};

function Pill({ Icon, text, color }: { Icon: LucideIcon; text: string; color: string }) {
  return (
    <div className="shrink-0 flex items-center gap-3 bg-[#171A19] border border-[#FAF7F2]/8 rounded-full pl-3 pr-5 py-2.5 hover:border-[#D05E3C]/40 transition-colors">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="font-mono text-[11px] text-[#FAF7F2]/85">{text}</span>
    </div>
  );
}

export default function MessageMarquee() {
  const loopA = [...messages, ...messages];
  const loopB = [...messages.slice().reverse(), ...messages.slice().reverse()];
  return (
    <section aria-label="Live operations feed"
      className="bg-[#1D211F] text-[#FAF7F2] py-8 border-y border-[#1D211F]/15 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-5 flex items-center justify-between font-mono text-[10px] tracking-widest text-[#FAF7F2]/40 uppercase">
        <span>{'// Live operations stream — observed across active tenants'}</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring" />
          <span className="text-emerald-400">streaming</span>
        </span>
      </div>
      <div className="relative space-y-4">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#1D211F] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#1D211F] to-transparent z-10 pointer-events-none" />
        <div className="flex gap-4 animate-marquee whitespace-nowrap will-change-transform">
          {loopA.map((m, i) => <Pill key={`a-${i}`} Icon={m.icon} text={m.text} color={colorByType[m.type]} />)}
        </div>
        <div className="flex gap-4 whitespace-nowrap will-change-transform" style={{ animation: "marquee 36s linear infinite reverse" }}>
          {loopB.map((m, i) => <Pill key={`b-${i}`} Icon={m.icon} text={m.text} color={colorByType[m.type]} />)}
        </div>
      </div>
    </section>
  );
}
