import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PDF Редактор — Печати и текст",
  description:
    "Современный онлайн-редактор PDF: добавляйте печати, подписи, текст и скачивайте готовые документы",
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf9f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sourceSerif.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster
          position="bottom-right"
          theme="light"
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: "14px",
              fontSize: "13px",
              fontWeight: 500,
              backgroundColor: "#ffffff",
              color: "#1f1e1d",
              border: "1px solid #e8e4d8",
            },
          }}
        />
      </body>
    </html>
  );
}
