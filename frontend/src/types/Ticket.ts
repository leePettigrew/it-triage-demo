// src/types/Ticket.ts
export interface Ticket {
    id: number
    text: string
    created_at: string
    assigned_to: string
    confidence: number
    status: "pending" | "routed"
}
