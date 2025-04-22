// src/components/Tabs.tsx
"use client"

import { ReactNode } from "react";

interface Tab {
    id: string;
    label: string;
}
interface TabsProps {
    tabs: Tab[];
    current: string;
    onChange: (id: string) => void;
}

export function Tabs({ tabs, current, onChange }: TabsProps) {
    return (
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`pb-2 px-4 font-medium transition ${
                        current === tab.id
                            ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
