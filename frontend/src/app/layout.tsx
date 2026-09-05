import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getUser } from "@/lib/session";
import { getAdminUser } from "@/lib/admin-session";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Example - Premium Otomotiv Deneyimi",
  description: "Example - Premium araç kiralama, yedek parça mağazası ve profesyonel otomotiv medya prodüksiyonu",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const admin = await getAdminUser();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  
  const isAdminPage = pathname.startsWith("/admin");

  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className={`min-h-full flex flex-col font-[family-name:var(--font-inter)] ${isAdminPage ? 'admin-panel' : ''}`}>
        {/* DEMO MODE BANNER */}
        {process.env.NEXT_PUBLIC_DEMO_MODE !== 'false' && (
          <div className="bg-secondary text-on-secondary text-center py-2 px-4 text-sm font-bold uppercase tracking-widest shadow-md">
            DEMO MODE - No real transactions are processed. Data is for demonstration only.
          </div>
        )}

        
        {!isAdminPage && <Navbar user={user} adminRole={admin?.role} />}
        
        <div className={`flex-grow ${!isAdminPage ? '' : ''}`}>
          {children}
        </div>
        
        {!isAdminPage && <Footer />}
        

      </body>
    </html>
  );
}
