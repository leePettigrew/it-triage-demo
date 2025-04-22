// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";

export const metadata = {
    title: "IT Ticket Triage",
    description: "Real‑time IT support ticket triage",
};

interface RootLayoutProps {
    children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
        <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <NavBar />
        {children}
        </body>
        </html>
    );
}
