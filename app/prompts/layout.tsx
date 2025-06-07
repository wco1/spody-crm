'use client';

import AdminLayout from '../components/AdminLayout';

export default function PromptsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminLayout>{children}</AdminLayout>;
} 