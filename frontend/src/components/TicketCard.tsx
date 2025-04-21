import { Ticket } from "@/types/Ticket";

export function TicketCard({ ticket }: { ticket: Ticket }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-xl p-4
                    hover:shadow-lg dark:hover:shadow-2xl transition-shadow">
            <p className="text-lg font-semibold mb-2">{ticket.text}</p>
            <p className="text-sm mb-1">
                <span className="font-medium">Assigned to:</span>{" "}
                <span className="text-indigo-400 dark:text-indigo-300">
          {ticket.assigned_to || "—"}
        </span>
            </p>
            <p className="text-sm mb-1">
                <span className="font-medium">Confidence:</span>{" "}
                <span className={ticket.confidence > 0.9 ? "text-green-600" : "text-yellow-400"}>
          {ticket.confidence.toFixed(2)}
        </span>
            </p>
            <p className="text-xs uppercase text-gray-400 dark:text-gray-500">
                {ticket.status}
            </p>
        </div>
    );
}
