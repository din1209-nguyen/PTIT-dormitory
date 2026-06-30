import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import { AuthProviderWrapper } from './AuthProviderWrapper';

export const metadata: Metadata = {
  title: 'PTIT Dormitory',
  description: 'Hệ thống quản lý sinh viên ký túc xá — Học viện Công nghệ Bưu chính Viễn thông',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
