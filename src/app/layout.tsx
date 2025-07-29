import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "그리고 엔터테인먼트 - GRIGO entertainment",
  description: "그리고 엔터테인먼트는 댄서, 안무가 섭외, 안무제작, 뮤직비디오 제작, 광고를 진행하고 있으며, 한 곳에서 머물러 있는 것이 아닌 가치를 찾아 새로운 길로 나아가는 마인드를 목표로 가지고 있습니다.",
  keywords: "댄서, 안무가, 섭외, 안무제작, 뮤직비디오, 광고, 그리고엔터테인먼트, GRIGO",
  authors: [{ name: "그리고 엔터테인먼트" }],
  creator: "그리고 엔터테인먼트",
  publisher: "그리고 엔터테인먼트",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://grigoent.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "그리고 엔터테인먼트 - GRIGO entertainment",
    description: "그리고 엔터테인먼트는 댄서, 안무가 섭외, 안무제작, 뮤직비디오 제작, 광고를 진행하고 있으며, 한 곳에서 머물러 있는 것이 아닌 가치를 찾아 새로운 길로 나아가는 마인드를 목표로 가지고 있습니다.",
    url: 'https://grigoent.com',
    siteName: '그리고 엔터테인먼트',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "그리고 엔터테인먼트 - GRIGO entertainment",
    description: "그리고 엔터테인먼트는 댄서, 안무가 섭외, 안무제작, 뮤직비디오 제작, 광고를 진행하고 있으며, 한 곳에서 머물러 있는 것이 아닌 가치를 찾아 새로운 길로 나아가는 마인드를 목표로 가지고 있습니다.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
