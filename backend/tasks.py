# backend/tasks.py

import os, asyncio
from celery import Celery
from sqlalchemy.orm import Session
from models import SessionLocal, Ticket, TicketStatus

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery = Celery("tasks", broker=redis_url, backend=redis_url)

def simple_classifier(text: str) -> tuple[str, float]:
    t = text.lower()
    if "network" in t: return "Network Team", 0.92
    if "password" in t: return "Applications Team", 0.88
    return "Desktop Team", 0.85

@celery.task
def classify_ticket(ticket_id: int):
    db: Session = SessionLocal()
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        db.close()
        return

    dept, conf = simple_classifier(ticket.text)
    ticket.assigned_to = dept
    ticket.confidence = conf
    ticket.status = TicketStatus.routed
    db.commit(); db.refresh(ticket); db.close()

    # Emit asynchronously so the coroutine runs properly
    from server import sio
    asyncio.run(
        sio.emit("ticket_routed", {
            "id": ticket.id,
            "text": ticket.text,
            "assigned_to": ticket.assigned_to,
            "confidence": ticket.confidence,
            "status": ticket.status.value,
            "created_at": ticket.created_at.isoformat(),
        })
    )
