import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SolarSystem",
  description:
    "Explore the Sun, planets, Pluto, and moons in an interactive 3D solar system.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://solarsystem.markmaga.com"),
  openGraph: {
    type: "website",
    siteName: "Mark Maga",
    title: "SolarSystem",
    description:
      "Explore the Sun, planets, Pluto, and moons in an interactive 3D solar system.",
    url: "https://solarsystem.markmaga.com/",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "SolarSystem",
    description:
      "Explore the Sun, planets, Pluto, and moons in an interactive 3D solar system.",
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SolarSystem",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#02040a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="app-layout" content="v8" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preload" href="/textures/earth.jpg" as="image" />
        <link rel="preload" href="/textures/sun.jpg" as="image" />
      </head>
      <body className="h-full overflow-hidden bg-[#02040a] font-sans text-white">
        {children}
        <Script id="vercel-analytics-init" strategy="afterInteractive">
          {`window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`}
        </Script>
        <Script
          src="/_vercel/insights/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}