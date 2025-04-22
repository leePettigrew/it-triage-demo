// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useTickets } from "@/hooks/useTickets";
import { useSocket } from "@/hooks/useSocket";
import { TicketCard } from "@/components/TicketCard";
import { Tabs } from "@/components/Tabs";
import { Ticket } from "@/types/Ticket";

export default function DashboardPage() {
    // --- Data & real‑time updates ---
    const apiTickets = useTickets();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    useEffect(() => { setTickets(apiTickets); }, [apiTickets]);

    // Listen for routed events
    const handleRouted = useCallback((updated: Ticket) => {
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    }, []);
    useSocket(handleRouted);

    // --- Tabs state & definitions ---
    const [selectedTeam, setSelectedTeam] = useState("All");
    const tabs = [
        { id: "All",           label: "All Teams" },
        { id: "Hardware Team", label: "Hardware"  },
        { id: "Software Team", label: "Software"  },
        { id: "Network Team",  label: "Network"   },
        { id: "Security Team", label: "Security"  },
        { id: "HR Team",       label: "HR"        },
    ];

    // Filter tickets by selected team
    const filtered = tickets.filter(t =>
        selectedTeam === "All" ? true : t.assigned_to === selectedTeam
    );
    const pending = filtered.filter(t => t.status === "pending");
    const routed  = filtered.filter(t => t.status === "routed");

    // --- Form state ---
    const [title,       setTitle]       = useState("");
    const [description, setDescription] = useState("");
    const [priority,    setPriority]    = useState<"Low"|"Normal"|"High"|"Urgent">("Normal");
    const [level,       setLevel]       = useState<"Level 1 Support"|"Level 2 Support"|"Level 3 Support">("Level 1 Support");

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        const res = await fetch("http://localhost:8000/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, priority, level }),
        });
        if (!res.ok) return;
        const ticket = await res.json() as Ticket;
        setTickets([ticket, ...tickets]);
        // reset form
        setTitle(""); setDescription("");
        setPriority("Normal"); setLevel("Level 1 Support");
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-200
                     dark:from-gray-900 dark:via-gray-950 dark:to-indigo-900 py-10">
            <div className="max-w-4xl mx-auto px-6">
                {/* Title */}
                <h1 className="text-5xl font-extrabold text-center mb-8 leading-tight
                       text-transparent bg-clip-text
                       bg-gradient-to-r from-indigo-700 via-indigo-400 to-pink-400
                       dark:from-indigo-300 dark:via-indigo-500 dark:to-pink-400
                       drop-shadow-lg tracking-tight">
                    IT Ticket Triage
                </h1>

                {/* ⬤ TABS */}
                <Tabs
                    tabs={tabs}
                    current={selectedTeam}
                    onChange={setSelectedTeam}
                />

                {/* ⬤ NEW TICKET FORM */}
                <form
                    onSubmit={onSubmit}
                    className="space-y-5 mb-14 bg-white/60 dark:bg-gray-900/60
                     backdrop-blur-lg rounded-2xl shadow-2xl p-8
                     border border-indigo-100 dark:border-gray-800 transition-all"
                >
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                                Title
                            </label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Short summary…"
                                className="mt-1 w-full px-4 py-2 border-2 border-indigo-200 dark:border-indigo-800
                           rounded-xl bg-white/80 dark:bg-gray-800/80
                           text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600
                           transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                className="mt-1 block w-full px-3 py-2 border-2 border-indigo-200 dark:border-indigo-800
                           rounded-xl bg-white/80 dark:bg-gray-800/80
                           text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600
                           transition"
                            >
                                {["Low","Normal","High","Urgent"].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                            Description
                        </label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Full details…"
                            className="mt-1 w-full px-4 py-2 border-2 border-indigo-200 dark:border-indigo-800
                         rounded-xl bg-white/80 dark:bg-gray-800/80
                         text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600
                         transition"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                                Support Level
                            </label>
                            <select
                                value={level}
                                onChange={e => setLevel(e.target.value as any)}
                                className="mt-1 block w-full px-3 py-2 border-2 border-indigo-200 dark:border-indigo-800
                           rounded-xl bg-white/80 dark:bg-gray-800/80
                           text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600
                           transition"
                            >
                                {["Level 1 Support","Level 2 Support","Level 3 Support"].map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-500
                           hover:from-indigo-700 hover:to-pink-600 dark:from-indigo-500 dark:to-pink-600
                           text-white font-bold rounded-xl shadow-lg
                           transition-all duration-200 transform hover:scale-105
                           focus:outline-none focus:ring-4 focus:ring-pink-200 dark:focus:ring-indigo-800"
                            >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-5 h-5 -ml-1" fill="none" stroke="currentColor" strokeWidth={2}
                       viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  Submit Ticket
                </span>
                            </button>
                        </div>
                    </div>
                </form>

                {/* ⬤ PENDING vs ROUTED LISTS */}
                <div className="grid md:grid-cols-2 gap-10">
                    <section>
                        <div className="flex items-center gap-2 mb-5">
                            <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 tracking-tight">
                                Pending
                            </h2>
                            <span
                                className="inline-block px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700
                           dark:bg-indigo-900 dark:text-indigo-200 text-xs font-semibold shadow-sm"
                            >
                {pending.length}
              </span>
                        </div>
                        <div className="space-y-6">
                            {pending.length
                                ? pending.map(t => <TicketCard key={t.id} ticket={t} />)
                                : <p className="italic text-gray-500 dark:text-gray-400">No pending tickets</p>
                            }
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-2 mb-5">
                            <h2 className="text-2xl font-bold text-pink-600 dark:text-pink-300 tracking-tight">
                                Routed
                            </h2>
                            <span
                                className="inline-block px-2 py-0.5 rounded-full bg-pink-100 text-pink-700
                           dark:bg-pink-900 dark:text-pink-200 text-xs font-semibold shadow-sm"
                            >
                {routed.length}
              </span>
                        </div>
                        <div className="space-y-6">
                            {routed.length
                                ? routed.map(t => <TicketCard key={t.id} ticket={t} />)
                                : <p className="italic text-gray-500 dark:text-gray-400">No routed tickets</p>
                            }
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
