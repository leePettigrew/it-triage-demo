// src/app/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useTickets } from "@/hooks/useTickets";
import { useSocket } from "@/hooks/useSocket";
import { useComments } from "@/hooks/useComments";
import { Ticket } from "@/types/Ticket";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip as PieTooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as BarTooltip,
    LineChart,
    Line,
    ResponsiveContainer,
    LabelList,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiAlertTriangle,
    FiCheckCircle,
    FiClock,
    FiMessageCircle,
    FiTrash2,
    FiX,
} from "react-icons/fi";
import { Spinner } from "@/components/Spinner";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
const API_BASE = "http://localhost:8000";

// Shared tooltip styling for dark mode
const tooltipStyles = {
    contentStyle: {
        backgroundColor: "rgba(30, 30, 30, 0.9)",
        border: "1px solid #444",
        borderRadius: 4,
        color: "#fff",
    },
    labelStyle: { color: "#aaa" },
    itemStyle: { color: "#fff" },
    cursor: { fill: "rgba(255, 255, 255, 0.1)" },
};

export default function DashboardPage() {
    // Data & real-time sync
    const allTickets = useTickets();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    useEffect(() => setTickets(allTickets), [allTickets]);
    useSocket((updated: Ticket) =>
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    );

    // Filters & state
    const [search, setSearch] = useState("");
    const [teamFilter, setTeamFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [priorityFilter, setPriorityFilter] = useState("All");
    const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);

    // Derived lists
    const teams = ["All", ...new Set(tickets.map((t) => t.assigned_to))];
    const statuses = ["All", ...new Set(tickets.map((t) => t.status))];
    const priorities = ["All", ...new Set(tickets.map((t) => t.priority))];

    // Filtered tickets
    const filtered = tickets
        .filter((t) =>
            [t.title, t.description].some((f) =>
                f.toLowerCase().includes(search.toLowerCase())
            )
        )
        .filter((t) => teamFilter === "All" || t.assigned_to === teamFilter)
        .filter((t) => statusFilter === "All" || t.status === statusFilter)
        .filter((t) => priorityFilter === "All" || t.priority === priorityFilter);

    // Metrics
    const metrics = {
        total: filtered.length,
        pending: filtered.filter((t) => t.status === "pending").length,
        routed: filtered.filter((t) => t.status === "routed").length,
        closed: filtered.filter((t) => t.status === "closed").length,
    };

    // Chart data
    const byTeam = Object.entries(
        filtered.reduce((acc, t) => {
            acc[t.assigned_to] = (acc[t.assigned_to] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    const byStatus = Object.entries(
        filtered.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    ).map(([status, count]) => ({ status, count }));

    const trendData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 86400000)
            .toISOString()
            .slice(0, 10);
        return {
            date,
            count: tickets.filter((t) => t.created_at.slice(0, 10) === date).length,
        };
    });

    // Actions
    const closeTicket = async (id: number) => {
        await fetch(`${API_BASE}/tickets/${id}/status?status=closed`, {
            method: "PATCH",
        });
        setTickets((ts) =>
            ts.map((t) => (t.id === id ? { ...t, status: "closed" } : t))
        );
    };

    const reopenTicket = async (id: number) => {
        await fetch(`${API_BASE}/tickets/${id}/status?status=routed`, {
            method: "PATCH",
        });
        setTickets((ts) =>
            ts.map((t) => (t.id === id ? { ...t, status: "routed" } : t))
        );
    };

    const deleteTicket = async (id: number) => {
        await fetch(`${API_BASE}/tickets/${id}`, { method: "DELETE" });
        setTickets((ts) => ts.filter((t) => t.id !== id));
    };

    return (
        <motion.div
            className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                    type="text"
                    placeholder="Search tickets…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {[
                    { label: "Team", opts: teams, val: teamFilter, fn: setTeamFilter },
                    {
                        label: "Status",
                        opts: statuses,
                        val: statusFilter,
                        fn: setStatusFilter,
                    },
                    {
                        label: "Priority",
                        opts: priorities,
                        val: priorityFilter,
                        fn: setPriorityFilter,
                    },
                ].map(({ label, opts, val, fn }) => (
                    <div key={label} className="flex flex-col">
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                            {label}
                        </label>
                        <select
                            value={val}
                            onChange={(e) => fn(e.target.value)}
                            className="mt-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                        >
                            {opts.map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        title: "Total",
                        value: metrics.total,
                        icon: <FiAlertTriangle className="text-indigo-600" />,
                        color: "bg-indigo-100/50",
                    },
                    {
                        title: "Pending",
                        value: metrics.pending,
                        icon: <FiClock className="text-yellow-600" />,
                        color: "bg-yellow-100/50",
                    },
                    {
                        title: "Routed",
                        value: metrics.routed,
                        icon: <FiCheckCircle className="text-green-600" />,
                        color: "bg-green-100/50",
                    },
                    {
                        title: "Closed",
                        value: metrics.closed,
                        icon: <FiAlertTriangle className="text-red-600" />,
                        color: "bg-red-100/50",
                    },
                ].map((m) => (
                    <motion.div
                        key={m.title}
                        whileHover={{ y: -2 }}
                        className={`p-4 rounded-xl flex items-center justify-between ${m.color}`}
                    >
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {m.title}
                            </p>
                            <p className="text-2xl font-bold">{m.value}</p>
                        </div>
                        <div className="text-3xl">{m.icon}</div>
                    </motion.div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="By Team">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={byTeam}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={60}
                                cursor="pointer"
                            >
                                {byTeam.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <PieTooltip {...tooltipStyles} />
                            <Legend
                                wrapperStyle={{ color: "#fff" }}
                                formatter={(value) => (
                                    <span className="dark:text-gray-300">{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="By Status">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={byStatus}>
                            <XAxis dataKey="status" tick={{ fill: "#ddd" }} />
                            <YAxis allowDecimals={false} tick={{ fill: "#ddd" }} />
                            <BarTooltip {...tooltipStyles} />
                            <Bar dataKey="count" fill={COLORS[0]} cursor="pointer">
                                <LabelList dataKey="count" position="top" fill="#fff" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="7‑Day Trend">
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={trendData}>
                            <XAxis dataKey="date" tick={{ fill: "#ddd" }} />
                            <YAxis allowDecimals={false} tick={{ fill: "#ddd" }} />
                            <BarTooltip {...tooltipStyles} />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke={COLORS[1]}
                                strokeWidth={2}
                                dot={{ r: 4, fill: COLORS[1] }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Ticket List */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                    Tickets ({filtered.length})
                </h2>
                <AnimatePresence>
                    {filtered.length ? (
                        filtered.map((ticket) => (
                            <motion.div
                                key={ticket.id}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col sm:flex-row justify-between gap-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        #{ticket.id} – {ticket.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                        {ticket.description}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 rounded">
                      {ticket.status}
                    </span>
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded">
                      {ticket.priority}
                    </span>
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {ticket.assigned_to}
                    </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setDetailTicket(ticket)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="View & Reply"
                                    >
                                        <FiMessageCircle className="text-xl text-blue-500" />
                                    </button>

                                    {ticket.status !== "closed" ? (
                                        <button
                                            onClick={() => closeTicket(ticket.id)}
                                            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-600 rounded"
                                        >
                                            Close
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => reopenTicket(ticket.id)}
                                            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 rounded"
                                        >
                                            Reopen
                                        </button>
                                    )}

                                    <button
                                        onClick={() => deleteTicket(ticket.id)}
                                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-600 rounded"
                                    >
                                        <FiTrash2 className="inline-block" /> Delete
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Spinner className="mx-auto mb-4" />
                            No tickets match filters.
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Detail & Replies Modal */}
            <AnimatePresence>
                {detailTicket && (
                    <TicketDetailModal
                        ticket={detailTicket}
                        onClose={() => setDetailTicket(null)}
                        onCloseTicket={closeTicket}
                        onReopenTicket={reopenTicket}
                        onDeleteTicket={deleteTicket}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Modal for ticket detail and replies
type ModalProps = {
    ticket: Ticket;
    onClose: () => void;
    onCloseTicket: (id: number) => Promise<void>;
    onReopenTicket: (id: number) => Promise<void>;
    onDeleteTicket: (id: number) => Promise<void>;
};

function TicketDetailModal({
                               ticket,
                               onClose,
                               onCloseTicket,
                               onReopenTicket,
                               onDeleteTicket,
                           }: ModalProps) {
    const { comments, loading, postComment } = useComments(ticket.id);
    const [newComment, setNewComment] = useState("");

    return (
        <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-full"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        #{ticket.id} – {ticket.title}
                    </h2>
                    <button onClick={onClose} className="text-gray-600 dark:text-gray-300">
                        <FiX className="text-2xl" />
                    </button>
                </div>
                <p className="mb-6 text-gray-700 dark:text-gray-300">
                    {ticket.description}
                </p>

                <div className="flex gap-2 mb-6">
                    {ticket.status !== "closed" ? (
                        <button
                            onClick={() => onCloseTicket(ticket.id).then(onClose)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg"
                        >
                            Mark Closed
                        </button>
                    ) : (
                        <button
                            onClick={() => onReopenTicket(ticket.id).then(onClose)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                        >
                            Reopen Ticket
                        </button>
                    )}
                    <button
                        onClick={() => onDeleteTicket(ticket.id).then(onClose)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg"
                    >
                        Delete Ticket
                    </button>
                </div>

                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                    Replies
                </h3>
                <div className="space-y-4 mb-6">
                    {loading ? (
                        <Spinner />
                    ) : comments.length ? (
                        comments.map((c) => (
                            <div key={c.id} className="space-y-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(c.created_at).toLocaleString()}
                                </p>
                                <p className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                                    {c.text}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">No replies yet.</p>
                    )}
                </div>

                <div className="flex gap-2">
                    <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a reply…"
                        className="flex-grow px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
                    />
                    <button
                        onClick={() => {
                            if (newComment.trim()) {
                                postComment(newComment.trim());
                                setNewComment("");
                            }
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                    >
                        Reply
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Chart card wrapper
const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({
                                                                               title,
                                                                               children,
                                                                           }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            {title}
        </h3>
        <div className="w-full h-48">{children}</div>
    </div>
);
