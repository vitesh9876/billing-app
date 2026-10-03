import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sri Sai Balaji Jewelry & Furniture",
  description: "Sri Sai Balaji Jewelry & Furniture Billing & Loan System",
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171915",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
