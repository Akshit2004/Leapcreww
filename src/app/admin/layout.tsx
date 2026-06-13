import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — LeapCreww",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fafaf9] font-sans">
      {children}
    </div>
  );
}
