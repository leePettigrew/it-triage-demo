// src/components/NavBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DarkModeToggle from "./DarkModeToggle";

export function NavBar() {
    const pathname = usePathname();
    const isHome = pathname === "/";
    const isDashboard = pathname.startsWith("/dashboard");

    const baseBtn = `
    px-4 py-2
    text-white font-semibold
    rounded-lg shadow-lg
    transition-transform duration-200
    hover:-translate-y-0.5 hover:scale-105
  `;

    const blueBtn = `
    bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700
    hover:from-indigo-600 hover:via-indigo-700 hover:to-indigo-800
  `;

    const pinkBtn = `
    bg-gradient-to-r from-pink-500 via-pink-600 to-pink-700
    hover:from-pink-600 hover:via-pink-700 hover:to-pink-800
  `;

    return (
        <header className="flex items-center justify-between p-4">
            <nav className="flex space-x-3">
                <Link
                    href="/"
                    className={`${baseBtn} ${isHome ? pinkBtn : blueBtn}`}
                >
                    Home
                </Link>
                <Link
                    href="/dashboard"
                    className={`${baseBtn} ${isDashboard ? pinkBtn : blueBtn}`}
                >
                    Dashboard
                </Link>
            </nav>
            <DarkModeToggle />
        </header>
    );
}
