"use client";

import { useState, useEffect } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

export default function DarkModeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    // On mount: only read saved preference (no OS fallback)
    useEffect(() => {
        console.log("🌗 Toggle mount, checking saved theme");
        const saved = localStorage.getItem("theme") as "light" | "dark" | null;
        if (saved === "dark") {
            setTheme("dark");
            document.documentElement.classList.add("dark");
        } else {
            // default is light; ensure class is removed
            setTheme("light");
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, []);

    // Whenever theme changes: persist and update <html>
    useEffect(() => {
        console.log("🌗 Applying theme:", theme);
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [theme]);

    const toggle = () => {
        console.log("🌗 Toggle clicked. Current:", theme);
        setTheme(prev => (prev === "dark" ? "light" : "dark"));
    };

    return (
        <button
            onClick={toggle}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <SunIcon className="h-6 w-6 text-yellow-400" />
            ) : (
                <MoonIcon className="h-6 w-6 text-gray-800" />
            )}
        </button>
    );
}
