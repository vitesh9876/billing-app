import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://smartshop.app").replace(/\/$/, "");
const gaId = process.env.NEXT_PUBLIC_GA_ID;
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sri Sai Balaji Jewelry & Furniture",
    template: "%s | Sri Sai Balaji",
  },
  description:
    "Official Billing, Pawn Loan Finance & Customer Records Management for Sri Sai Balaji Jewelry & Furniture.",
  keywords: [
    "Sri Sai Balaji",
    "Jewelry",
    "Gold Loans",
    "Pawn Finance",
    "Silver Ornaments",
    "Billing Software",
  ],
  authors: [{ name: "Sri Sai Balaji" }],
  creator: "Sri Sai Balaji",
  publisher: "Sri Sai Balaji",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/shop-logo-mark.png",
    shortcut: "/shop-logo-mark.png",
    apple: "/shop-logo-mark.png",
  },
  appleWebApp: {
    title: "Sri Sai Balaji",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Sri Sai Balaji Jewelry & Furniture",
    description:
      "Gold loan finance, jewellery billing, customer management, and automated SMS notifications.",
    url: siteUrl,
    siteName: "Sri Sai Balaji Jewelry & Furniture",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/shop-logo-horizontal.png",
        width: 1200,
        height: 630,
        alt: "Sri Sai Balaji Jewelry & Furniture Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sri Sai Balaji Jewelry & Furniture",
    description: "Gold loan finance, jewellery billing, and customer management.",
    images: ["/shop-logo-horizontal.png"],
  },
  verification: {
    google: googleVerification || undefined,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B1320",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "JewelryStore",
  name: "Sri Sai Balaji Jewelry & Furniture",
  alternateName: "Sri Sai Balaji",
  url: siteUrl,
  logo: `${siteUrl}/shop-logo-horizontal.png`,
  image: `${siteUrl}/shop-logo-horizontal.png`,
  description:
    "Trusted retail gold jewelry, silver articles, and pawn loan finance services.",
  priceRange: "₹₹",
  currenciesAccepted: "INR",
  paymentAccepted: "Cash, UPI, Bank Transfer",
  openingHours: "Mo-Su 09:30-21:00",
  address: {
    "@type": "PostalAddress",
    addressRegion: "Andhra Pradesh",
    addressCountry: "IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap"
          rel="stylesheet"
        />
        {/* Organization / LocalBusiness Schema (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Google Analytics (activates if NEXT_PUBLIC_GA_ID is set) */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
