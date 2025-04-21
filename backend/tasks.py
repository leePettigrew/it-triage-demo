# backend/tasks.py

import os
import numpy as np
from celery import Celery
from sqlalchemy.orm import Session
import openai

from models import SessionLocal, Ticket, TicketStatus

# 1. Celery broker & backend
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery    = Celery("tasks", broker=redis_url, backend=redis_url)

# 2. Instantiate the OpenAI v1 client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 3. Define human‑readable team prompts
_TEAM_PROMPTS = {
    "Hardware Team": "This ticket concerns hardware issues, like faulty devices or peripherals.",
    "Software Team": "This ticket concerns software or application problems.",
    "Network Team":  "This ticket concerns networking issues, such as connectivity or VPN.",
    "Security Team": "This ticket concerns security or compliance issues.",
    "HR Team":       "This ticket concerns HR matters, like personal issues or benefits."
}

# 4. Pre‑compute embeddings for each team prompt exactly once at import time
_label_names = list(_TEAM_PROMPTS.keys())
_label_texts = [ _TEAM_PROMPTS[name] for name in _label_names ]

_label_resp = client.embeddings.create(
    model="text-embedding-ada-002",
    input=_label_texts
)

# .data is a list of CreateEmbeddingResponseItem; each has .embedding
_label_vectors = np.vstack([ np.array(item.embedding) for item in _label_resp.data ])


def ml_classifier(text: str) -> tuple[str, float]:
    """
    - Embed the new ticket text
    - Compute cosine similarity vs each team‑prompt vector
    - Return (best_team_name, similarity_score)
    """
    resp = client.embeddings.create(
        model="text-embedding-ada-002",
        input=[text]
    )
    ticket_vec = np.array(resp.data[0].embedding)

    # cosine similarity
    sims = (_label_vectors @ ticket_vec) / (
        np.linalg.norm(_label_vectors, axis=1) * np.linalg.norm(ticket_vec) + 1e-8
    )
    best_idx = int(np.argmax(sims))
    return _label_names[best_idx], float(sims[best_idx])


@celery.task
def classify_ticket(ticket_id: int):
    """
    1) Fetch ticket
    2) Classify via our embedding router
    3) Persist assignment & confidence
    4) Emit 'ticket_routed' for real‑time UI
    """
    db: Session = SessionLocal()
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        db.close()
        return

    team, conf = ml_classifier(ticket.text)
    ticket.assigned_to = team
    ticket.confidence  = conf
    ticket.status      = TicketStatus.routed

    db.commit()
    db.refresh(ticket)
    db.close()

    # fire the update to any connected Socket.IO clients
    from server import sio
    sio.start_background_task(
        sio.emit,
        "ticket_routed",
        {
            "id":          ticket.id,
            "text":        ticket.text,
            "assigned_to": ticket.assigned_to,
            "confidence":  ticket.confidence,
            "status":      ticket.status.value,
            "created_at":  ticket.created_at.isoformat(),
        }
    )
