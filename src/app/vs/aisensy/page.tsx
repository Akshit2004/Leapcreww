import type { Metadata } from "next";
import ComparisonPage from "@/features/landing/comparison/ComparisonPage";
import { COMPETITORS } from "@/features/landing/comparison/data";

export const metadata: Metadata = {
  title: "LeapCrew vs AiSensy — Honest WhatsApp Platform Comparison (2026)",
  description:
    "AiSensy vs LeapCrew for Indian D2C brands: revenue attribution, COD confirmation, NDR rescue, native commerce checkout. An honest side-by-side — including when AiSensy is the better pick.",
};

export default function Page() {
  return <ComparisonPage data={COMPETITORS.aisensy} />;
}
