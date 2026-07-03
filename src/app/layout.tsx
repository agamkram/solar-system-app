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
            __html: `(function(){function s(){var h=window.innerHeight;document.documentElement.style.setProperty("--screen-h",h+"px");var p=document.createElement("div");p.style.cssText="padding-bottom:env(safe-area-inset-bottom,0px)";document.documentElement.appendChild(p);var b=parseFloat(getComputedStyle(p).paddingBottom)||0;p.remove();document.documentElement.style.setProperty("--safe-bottom",b+"px");var a=matchMedia("(display-mode:standalone)").matches||navigator.standalone,m=matchMedia("(max-width:767px)").matches;if(a)document.documentElement.classList.add("pwa-standalone");if(a&&m)document.documentElement.classList.add("pwa-phone")}s();window.addEventListener("resize",s);window.visualViewport&&window.visualViewport.addEventListener("resize",s)})();`,
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