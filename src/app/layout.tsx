import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

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
  description: "그리고 엔터테인먼트는 전속 안무가 매니지먼트, 댄서 에이전시·매거진 deetz, 공연제작 Flowmaker, 영상제작 REACT Studio를 운영합니다.",
  keywords: "댄서, 안무가, 섭외, 안무제작, 공연제작, 영상제작, 댄서 에이전시, 댄서 매거진, Flowmaker, REACT Studio, deetz, 그리고엔터테인먼트, GRIGO",
  authors: [{ name: "그리고 엔터테인먼트" }],
  creator: "그리고 엔터테인먼트",
  publisher: "그리고 엔터테인먼트",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://grigoent.co.kr'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "그리고 엔터테인먼트 - GRIGO entertainment",
    description: "전속 안무가 매니지먼트, 댄서 에이전시·매거진, 공연제작, 영상제작을 연결하는 댄스 엔터테인먼트 운영사입니다.",
    url: 'https://grigoent.co.kr',
    siteName: '그리고 엔터테인먼트',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "그리고 엔터테인먼트 - GRIGO entertainment",
    description: "GRIGO, deetz, Flowmaker, REACT Studio를 연결하는 댄스 엔터테인먼트 운영사입니다.",
  },
  other: {
    'naver-site-verification': '6917ca265e4f4b3282568bb521b06d1cf3980588',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // GEO/AEO: schema.org JSON-LD (Organization + WebSite)
  const SITE = "https://grigoent.co.kr";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "그리고 엔터테인먼트",
        alternateName: "GRIGO Entertainment",
        url: SITE,
        email: "contact@grigoent.co.kr",
        description:
          "전속 안무가 매니지먼트, 댄서 에이전시·매거진 deetz, 공연제작 Flowmaker, 영상제작 REACT Studio를 운영하는 댄스 엔터테인먼트.",
        areaServed: "KR",
        department: [
          { "@type": "Organization", name: "GRIGO Management" },
          { "@type": "Organization", name: "deetz", url: "https://deetz.kr" },
          { "@type": "Organization", name: "Flowmaker" },
          { "@type": "Organization", name: "REACT Studio", url: "https://reactstudio.kr" },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: SITE,
        name: "그리고 엔터테인먼트",
        inLanguage: "ko-KR",
        publisher: { "@id": `${SITE}/#organization` },
      },
    ],
  };
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster />
            <Analytics />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
