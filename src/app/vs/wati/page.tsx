import type { Metadata } from "next";
import ComparisonPage from "@/features/landing/comparison/ComparisonPage";
import { COMPETITORS } from "@/features/landing/comparison/data";

export const metadata: Metadata = {
  title: "LeapCrew vs Wati — Honest WhatsApp Platform Comparison (2026)",
  description:
    "Wati vs LeapCrew for Indian D2C brands: revenue attribution, COD confirmation, NDR rescue, Shiprocket integration, INR pricing. An honest side-by-side — including when Wati is the better pick.",
};

export default function Page() {
  return <ComparisonPage data={COMPETITORS.wati} />;
}
