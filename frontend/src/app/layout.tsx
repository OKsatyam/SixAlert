// Root layout — fonts, auth provider, navbar
import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SixAlert — Live Cricket Offer Alerts",
  description: "Real-time deal alerts for every six hit in IPL matches",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${bebasNeue.variable} ${dmSans.variable} font-sans bg-zinc-950 text-zinc-100 antialiased`}
      >
        <AuthProvider>
          <Navbar />
          <main className="pt-14 min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
