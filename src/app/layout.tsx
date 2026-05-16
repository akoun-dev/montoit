import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mon Toit — Location de biens immobiliers",
  description:
    "Mon Toit, la plateforme de location immobilière en Côte d'Ivoire. Trouvez votre prochain logement ou publiez votre annonce en quelques clics.",
  keywords: [
    "Mon Toit",
    "location",
    "immobilier",
    "Côte d'Ivoire",
    "Abidjan",
    "appartement",
    "maison",
    "loyer",
    "annonce immobilière",
    "location meublée",
    "ANSUT",
  ],
  authors: [{ name: "Mon Toit" }],
  applicationName: "Mon Toit",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Mon Toit — Location de biens immobiliers",
    description:
      "Trouvez votre prochain logement ou publiez votre annonce sur Mon Toit, la plateforme immobilière de Côte d'Ivoire.",
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
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Mon Toit",
    "msapplication-TileColor": "#FF6C2F",
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
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#FF6C2F" />
      </head>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
