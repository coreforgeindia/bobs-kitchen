import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "BOB'S Satellite Kitchen | Fusion Snack Packs, Burgers, Rolls & Desserts (Marathahalli)",
  description: "Official ordering portal for BOB'S Satellite Kitchen, Marathahalli Bengaluru. Open 12 PM - 12 AM. Order delicious fusion snack packs, rolls, burgers, sandwiches & desserts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${nunito.className} bg-slate-50 text-slate-900 antialiased selection:bg-yellow-400 selection:text-black`}>
        {children}
      </body>
    </html>
  );
}
