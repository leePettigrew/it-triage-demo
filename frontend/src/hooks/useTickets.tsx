// src/hooks/useTickets.tsx
'use client'

import { useState, useEffect } from "react"
import { Ticket } from "../types/Ticket"

export function useTickets(pollInterval = 5000) {
    const [tickets, setTickets] = useState<Ticket[]>([])

    useEffect(() => {
        async function fetchAll() {
            const res = await fetch("http://localhost:8000/tickets")
            const data = (await res.json()) as Ticket[]
            setTickets(data)
        }
        fetchAll()
        const id = setInterval(fetchAll, pollInterval)
        return () => clearInterval(id)
    }, [pollInterval])

    return tickets
}
