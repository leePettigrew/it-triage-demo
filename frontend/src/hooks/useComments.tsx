// src/hooks/useComments.tsx

import { useState, useEffect, useCallback } from 'react';

export interface Comment {
    id: number;
    text: string;
    created_at: string;
}

export function useComments(ticketId: number) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`http://localhost:8000/tickets/${ticketId}/comments`);
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data: Comment[] = await res.json();
            setComments(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    const postComment = useCallback(async (text: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `http://localhost:8000/tickets/${ticketId}/comments`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                }
            );
            if (!res.ok) throw new Error(`Error ${res.status}`);
            // re‑fetch list after posting
            await fetchComments();
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    }, [ticketId, fetchComments]);

    useEffect(() => {
        if (ticketId) fetchComments();
    }, [ticketId, fetchComments]);

    return { comments, loading, error, postComment };
}
