// src/hooks/useSocket.tsx
'use client'

import { useEffect } from "react"
import { io } from "socket.io-client"
import { Ticket } from "../types/Ticket"

export function useSocket(onTicketRouted: (t: Ticket) => void) {
    useEffect(() => {
        const socket = io("http://localhost:8000")
        socket.on("ticket_routed", onTicketRouted)
        return () => { socket.disconnect() }
    }, [onTicketRouted])
}
