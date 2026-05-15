import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mon Toit — Location de biens immobiliers",
  description:
    "Mon Toit, la plateforme de location immobilière. Trouvez votre prochain logement ou publiez votre annonce en quelques clics.",
  keywords: [
    "Mon Toit",
    "location",
    "immobilier",
    "appartement",
    "maison",
    "loyer",
    "annonce immobilière",
    "location meublée",
  ],
  authors: [{ name: "Mon Toit" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Mon Toit — Location de biens immobiliers",
    description:
      "Trouvez votre prochain logement ou publiez votre annonce sur Mon Toit.",
    siteName: "Mon Toit",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mon Toit — Location de biens immobiliers",
    description:
      "Trouvez votre prochain logement ou publiez votre annonce sur Mon Toit.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="scroll-smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
