'use client';

import AdminLayout from '../components/AdminLayout';

export default function AnalyticsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminLayout>{children}</AdminLayout>;
} 