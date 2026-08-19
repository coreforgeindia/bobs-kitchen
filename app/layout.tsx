import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Outfit, Playfair_Display } from 'next/font/google'
import './globals.css'

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: "Bob's Satellite Kitchen | Gourmet Burgers, Rolls & Snacks | Bengaluru",
  description: "Bengaluru's boldest burgers, wraps and comfort food. Free delivery on orders above ₹300 within 3 km radius of Indiranagar franchise.",
  icons: { icon: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-W77TEbkHIINDyTaBMs0QUbr3tSnyNB.png', apple: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-W77TEbkHIINDyTaBMs0QUbr3tSnyNB.png' },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#FAFAFA' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${sans.variable} ${serif.variable} ${outfit.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

