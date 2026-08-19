import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Michroma } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const michroma = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
});

export const metadata: Metadata = {
  title: "Solar System — 3D sun, planets, moons, and Pluto | Mark Maga",
  description:
    "Explore the Sun, planets, Pluto, and moons in an interactive 3D solar system.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://solarsystem.markmaga.com"),
  alternates: { canonical: "https://solarsystem.markmaga.com/" },
  openGraph: {
    type: "website",
    siteName: "Mark Maga",
    title: "Solar System — 3D sun, planets, moons, and Pluto",
    description:
      "Explore the Sun, planets, Pluto, and moons in an interactive 3D solar system.",
    url: "https://solarsystem.markmaga.com/",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "Solar System — 3D sun, planets, moons, and Pluto",
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
  maximumScale: 1,
  userScalable: false,
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
      className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="app-layout" content="v13" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var n = window.navigator;
  var standalone = n.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches;
  if (!standalone) return;
  var root = document.documentElement;
  root.classList.add("pwa-standalone");
  var iw = window.innerWidth || 0;
  var ih = window.innerHeight || 0;
  var sw = window.screen.width || 0;
  var sh = window.screen.height || 0;
  var screenMax = Math.max(sw, sh);
  var screenMin = Math.min(sw, sh);
  var fillH = ih >= iw ? Math.max(ih, screenMax) : Math.max(ih, screenMin);
  var extra = 0;
  if (Math.min(iw, ih) >= 600 && screenMax < ih - 10) extra = 20;
  root.style.setProperty("--pwa-fill-h", fillH + "px");
  root.style.setProperty("--pwa-extra-b", extra + "px");
  root.style.height = fillH + extra + "px";
  root.style.minHeight = fillH + extra + "px";
})();`,
          }}
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preload" href="/textures/earth.jpg" as="image" />
        <link rel="preload" href="/textures/sun.jpg" as="image" />
      </head>
      <body className="overflow-hidden bg-[#02040a] font-sans text-white">
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