import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@uploadthing/react/styles.css";
import { AppProvider } from "@/shared/context/AppContext";
import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { ConfirmProvider } from "@/shared/components/ui/ConfirmDialog";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeapCrew AI | WhatsApp Marketing Automation & Team Inbox",
  description: "Scale your business with LeapCrew AI's ultimate WhatsApp Marketing Platform. Broadcast campaigns, automate with chatbots, and manage customer communications through a shared Team Inbox.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${plusJakartaSans.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-amber-50 text-stone-900">
        <AuthProvider>
          <AppProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
            <Toaster
              position="bottom-center"
              gutter={10}
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: 0,
                  border: "1px solid #1c1917",
                  background: "#ffffff",
                  color: "#1c1917",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "10px 14px",
                  boxShadow: "0 8px 24px -8px rgba(28,25,23,0.25)",
                },
                success: { iconTheme: { primary: "#128c7e", secondary: "#ffffff" } },
                error: {
                  style: { border: "1px solid #fca5a5" },
                  iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
                },
              }}
            />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
