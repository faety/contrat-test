import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { themeInitScript } from "@/components/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Boyia — Apprends, entreprends et sois récompensé",
    template: "%s · Boyia",
  },
  description:
    "Boyia App récompense l'apprentissage, l'entrepreneuriat et les comportements positifs avec la Boyia Currency, une unité numérique interne simple, sécurisée et transparente.",
  applicationName: "Boyia App",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
