import type { Metadata } from "next";
import "./globals.css";

// Форсируем динамический рендеринг для всех страниц
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Spody Admin Panel",
  description: "CRM система для управления приложением Spody",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
