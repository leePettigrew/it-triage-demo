import os
import json
import socketio
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from models import (
    init_db,
    TicketCreate,
    TicketRead,
    Ticket,
    TicketStatus,
    Comment,
    CommentCreate,
    CommentRead
)

# --- JSON append helper ---
# Map team names to your prototype JSON filenames
PROTOTYPE_FILES = {
    "Hardware Team": "Hardware.json",
    "Software Team": "Software.json",
    "Network Team":  "Network.json",
    "Security Team": "Security.json",
    "HR Team":       "HR.json",
}

def append_ticket_to_json(ticket: Ticket) -> None:
    """
    When a ticket is closed, append its details to the corresponding JSON file.
    """
    fname = PROTOTYPE_FILES.get(ticket.assigned_to)
    if not fname:
        return

    path = os.path.join(os.path.dirname(__file__), fname)
    # Open file for read/write
    with open(path, "r+", encoding="utf-8") as f:
        data = json.load(f)
        data.append({
            "title":       ticket.title,
            "description": ticket.description,
            "team":        ticket.assigned_to
        })
        f.seek(0)
        json.dump(data, f, indent=2)
        f.truncate()

# 1. Allowed frontend origins
FRONTEND_ORIGINS = ["http://localhost:3000"]

# --- Socket.IO setup ---
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=FRONTEND_ORIGINS
)

# --- FastAPI setup ---
app = FastAPI(title="IT Triage with Real‑Time Updates")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tickets.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

@app.on_event("startup")
def on_startup():
    # Ensure tables exist (tickets + comments)
    init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- REST endpoints ---

@app.post("/tickets", response_model=TicketRead)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    ticket = Ticket(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        level=payload.level,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Kick off async ML routing
    from tasks import classify_ticket
    classify_ticket.delay(ticket.id)

    return ticket

@app.get("/tickets", response_model=list[TicketRead])
def list_tickets(db: Session = Depends(get_db)):
    return db.query(Ticket).order_by(Ticket.created_at.desc()).all()

@app.patch("/tickets/{ticket_id}/status", response_model=TicketRead)
def update_ticket_status(
    ticket_id: int,
    status: TicketStatus,
    db: Session = Depends(get_db)
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    ticket.status = status
    db.commit()
    db.refresh(ticket)

    # Append closed ticket into JSON for future learning
    if status == TicketStatus.closed:
        append_ticket_to_json(ticket)

    return ticket

@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    db.delete(ticket)
    db.commit()
    return {"detail": "Deleted"}

# --- Comment endpoints ---

@app.get("/tickets/{ticket_id}/comments", response_model=list[CommentRead])
def list_comments(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return (
        db.query(Comment)
          .filter(Comment.ticket_id == ticket_id)
          .order_by(Comment.created_at.asc())
          .all()
    )

@app.post(
    "/tickets/{ticket_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED
)
async def create_comment(
    ticket_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db)
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")

    comment = Comment(ticket_id=ticket_id, text=payload.text)
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # emit new_comment for real‑time front‑end updates
    await sio.emit(
        "new_comment",
        {
            "ticket_id": ticket_id,
            "id": comment.id,
            "text": comment.text,
            "created_at": comment.created_at.isoformat(),
        }
    )

    return comment

# --- Mount Socket.IO ASGI app under /socket.io ---
asgi_app = socketio.ASGIApp(
    sio,
    app,
    socketio_path="/socket.io"
)

# --- Socket.IO events ---

@sio.event
async def connect(sid, environ):
    print("Client connected:", sid)

@sio.event
async def disconnect(sid):
    print("Client disconnected:", sid)
