import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@uploadthing/react/styles.css";
import { AppProvider } from "@/shared/context/AppContext";
import { AuthProvider } from "@/features/auth/context/AuthProvider";
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
  title: "WappFlow | WhatsApp Marketing Automation & Team Inbox",
  description: "Scale your business with WappFlow's ultimate WhatsApp Marketing Platform. Broadcast campaigns, automate with chatbots, and manage customer communications through a shared Team Inbox.",
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
            {children}
            <Toaster position="bottom-center" />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
