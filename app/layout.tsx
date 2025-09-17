// Ongwu笔记根布局
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ongwu笔记',
  description: '基于GitHub + Vercel + Cloudflare D1的Web笔记应用',
  authors: [{ name: 'ongwu', url: 'https://ongwu.cn' }],
  keywords: ['笔记', 'markdown', 'ongwu', 'web应用'],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div id="ongwu_note_app" className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}
