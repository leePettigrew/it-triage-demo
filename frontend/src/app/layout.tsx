// src/app/layout.tsx
import './globals.css'
import type { ReactNode } from 'react'
import DarkModeToggle from '@/components/DarkModeToggle'

export const metadata = {
    title: 'IT Ticket Triage',
    description: 'Real‑time IT support ticket triage',
}

interface RootLayoutProps {
    children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
        <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <header className="flex justify-end p-4">
            <DarkModeToggle />
        </header>
        {children}
        </body>
        </html>
    )
}
