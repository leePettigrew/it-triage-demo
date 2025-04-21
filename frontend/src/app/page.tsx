"use client"

import { useState, useEffect, useCallback, FormEvent } from "react"
import { useTickets } from "@/hooks/useTickets"
import { useSocket }  from "@/hooks/useSocket"
import { TicketCard } from "@/components/TicketCard"
import { Ticket }     from "@/types/Ticket"

export default function DashboardPage() {
    const apiTickets = useTickets()
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [newText, setNewText] = useState("")

    useEffect(() => {
        setTickets(apiTickets)
    }, [apiTickets])

    const handleRouted = useCallback((updated: Ticket) => {
        setTickets(prev =>
            prev.map(t => (t.id === updated.id ? updated : t))
        )
    }, [])
    useSocket(handleRouted)

    const pending = tickets.filter(t => t.status === "pending")
    const routed  = tickets.filter(t => t.status === "routed")

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const text = newText.trim()
        if (!text) return

        const res = await fetch("http://localhost:8000/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        })
        if (!res.ok) return

        const ticket = (await res.json()) as Ticket
        setTickets(prev => [ticket, ...prev])
        setNewText("")
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
            <div className="max-w-5xl mx-auto px-6">
                <h1 className="text-4xl font-extrabold text-center mb-8
                       text-gray-800 dark:text-gray-100">
                    IT Ticket Triage
                </h1>

                <form onSubmit={onSubmit} className="flex gap-3 mb-10">
                    <input
                        type="text"
                        placeholder="Describe issue…"
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        className="
              flex-grow px-5 py-3
              border-2 border-gray-300 dark:border-gray-700
              rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              focus:outline-none focus:border-indigo-500
              transition
            "
                    />
                    <button
                        type="submit"
                        className="
              px-8 py-3
              bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600
              text-white font-semibold
              rounded-lg
              transition
            "
                    >
                        Submit
                    </button>
                </form>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Pending */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4
                           text-gray-700 dark:text-gray-200">
                            Pending
                        </h2>
                        {pending.length > 0 ? (
                            <div className="space-y-4">
                                {pending.map(t => <TicketCard key={t.id} ticket={t} />)}
                            </div>
                        ) : (
                            <p className="italic text-gray-500 dark:text-gray-400">
                                No pending tickets
                            </p>
                        )}
                    </section>

                    {/* Routed */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4
                           text-gray-700 dark:text-gray-200">
                            Routed
                        </h2>
                        {routed.length > 0 ? (
                            <div className="space-y-4">
                                {routed.map(t => <TicketCard key={t.id} ticket={t} />)}
                            </div>
                        ) : (
                            <p className="italic text-gray-500 dark:text-gray-400">
                                No routed tickets
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </main>
    )
}
