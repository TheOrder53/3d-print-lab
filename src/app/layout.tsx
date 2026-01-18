import type { Metadata } from 'next'
import { Space_Grotesk, Orbitron } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '3D Print Lab | 3D Baskı & Yazıcı Satış',
  description: 'Profesyonel 3D baskı hizmetleri ve 3D yazıcı satışı. Hayallerinizi katmana dönüştürüyoruz.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={`${spaceGrotesk.variable} ${orbitron.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
