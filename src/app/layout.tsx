import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "JuniFit",
  description: "개인 운동 기록 및 관리 웹 앱",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JuniFit",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">
        <AuthGuard>
          <div className="w-full max-w-md mx-auto min-h-screen">
            {children}
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
