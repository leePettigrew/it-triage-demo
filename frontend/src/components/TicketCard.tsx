// src/components/TicketCard.tsx

import { Ticket } from "@/types/Ticket"

export function TicketCard({ ticket }: { ticket: Ticket }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-xl p-4
                    hover:shadow-lg dark:hover:shadow-2xl transition-shadow">
            <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-gray-100">
                {ticket.title}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
                {ticket.description}
            </p>
            <div className="flex flex-wrap gap-2 text-sm mb-3">
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-700 rounded align-middle">
                    Priority: <strong>{ticket.priority}</strong>
                  </span>
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded align-middle">
                    Level: <strong>{ticket.level}</strong>
                  </span>
            </div>


            <p className="text-sm mb-1">
                <span className="font-medium">Assigned to:</span>{" "}
                <span className="text-indigo-400 dark:text-indigo-300">
          {ticket.assigned_to || "—"}
        </span>
            </p>
            <p className="text-sm mb-1">
                <span className="font-medium">Confidence:</span>{" "}
                <span className={
                    ticket.confidence > 0.9
                        ? "text-green-600"
                        : ticket.confidence > 0.75
                            ? "text-yellow-400"
                            : "text-red-500"
                }>
          {ticket.confidence.toFixed(2)}
        </span>
            </p>
            <p className="text-xs uppercase text-gray-400 dark:text-gray-500">
                {ticket.status}
            </p>
        </div>
    )
}
