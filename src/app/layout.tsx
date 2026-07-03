import type { Metadata, Viewport } from "next";
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
  title: "Solar System",
  description:
    "Explore the Sun, planets, Pluto, and moons in an interactive 3D solar system.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Solar System",
  },
  icons: {
    icon: "/apple-touch-icon.png",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=document.createElement("div");p.style.cssText="padding-bottom:env(safe-area-inset-bottom,0px)";document.documentElement.appendChild(p);var b=parseFloat(getComputedStyle(p).paddingBottom)||0;p.remove();if(b<20)b=34;document.documentElement.style.setProperty("--safe-bottom",b+"px");var s=matchMedia("(display-mode:standalone)").matches||navigator.standalone;var m=matchMedia("(max-width:767px)").matches;if(s)document.documentElement.classList.add("pwa-standalone");if(s&&m)document.documentElement.classList.add("pwa-phone")}catch(e){document.documentElement.style.setProperty("--safe-bottom","34px")}})();`,
          }}
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preload" href="/textures/earth.jpg" as="image" />
        <link rel="preload" href="/textures/sun.jpg" as="image" />
      </head>
      <body className="h-full overflow-hidden bg-[#02040a] font-sans text-white">
        {children}
      </body>
    </html>
  );
}