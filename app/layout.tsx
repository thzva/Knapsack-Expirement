import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import HealthCheck from '@/components/health-check'

export const metadata: Metadata = {
  title: 'Knapsack Study',
  description: 'Interactive Problem Solving Study',
}

// Combine both font classNames
const fontClassNames = `${GeistSans.className} ${GeistMono.variable}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={fontClassNames}>
      <body>
        <HealthCheck />
        {children}
      </body>
    </html>
  )
}
