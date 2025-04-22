// src/types/Ticket.ts
export interface Ticket {
    id: number;
    title: string;
    description: string;
    created_at: string;
    updated_at: string;
    priority: "Low" | "Normal" | "High" | "Urgent";
    level: "Level 1 Support" | "Level 2 Support" | "Level 3 Support";
    assigned_to: string;
    confidence: number;
    status: "pending" | "classified" | "routed" | "closed";
}
