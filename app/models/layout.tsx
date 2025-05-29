'use client';

import AdminLayout from '../components/AdminLayout';

export default function ModelsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminLayout>{children}</AdminLayout>;
} 