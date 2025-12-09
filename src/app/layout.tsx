import "./globals.css";
import type { ReactNode } from "react";
import AuthGuard from "@/components/AuthGuard";

export const metadata = {
  title: "JuniFit",
  description: "운동 기록 앱",
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
