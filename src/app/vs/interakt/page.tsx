import type { Metadata } from "next";
import ComparisonPage from "@/features/landing/comparison/ComparisonPage";
import { COMPETITORS } from "@/features/landing/comparison/data";

export const metadata: Metadata = {
  title: "LeapCrew vs Interakt — Honest WhatsApp Platform Comparison (2026)",
  description:
    "Interakt vs LeapCrew for Indian D2C brands: revenue attribution, COD confirmation, NDR rescue, developer API. An honest side-by-side — including when Interakt is the better pick.",
};

export default function Page() {
  return <ComparisonPage data={COMPETITORS.interakt} />;
}
