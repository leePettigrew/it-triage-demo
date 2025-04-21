# backend/server.py

import os
import socketio
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from models import init_db, TicketCreate, TicketRead, Ticket

# 1. Only allow our React frontend origin
FRONTEND_ORIGINS = ["http://localhost:3000"]

# --- Socket.IO setup ---
# CORS is configured here, on the AsyncServer
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=FRONTEND_ORIGINS   # ← correct place for CORS
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
    ticket = Ticket(text=payload.text)
    db.add(ticket); db.commit(); db.refresh(ticket)
    from tasks import classify_ticket
    classify_ticket.delay(ticket.id)
    return ticket

@app.get("/tickets", response_model=list[TicketRead])
def list_tickets(db: Session = Depends(get_db)):
    return db.query(Ticket).order_by(Ticket.created_at.desc()).all()

# --- Mount Socket.IO ASGI app under /socket.io ---
# Removed cors_allowed_origins here (unsupported)
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
