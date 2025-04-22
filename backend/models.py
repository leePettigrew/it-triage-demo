# backend/models.py

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

from pydantic import BaseModel

# --- SQLAlchemy setup ---
DATABASE_URL = "sqlite:///./tickets.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- ORM models ---

class TicketStatus(str, Enum):
    pending    = "pending"
    classified = "classified"
    routed     = "routed"
    closed     = "closed"


class Ticket(Base):
    __tablename__ = "tickets"

    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String, nullable=False)
    description  = Column(String, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at   = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    priority     = Column(String, default="Normal", nullable=False)
    level        = Column(String, default="Level 1 Support", nullable=False)
    assigned_to  = Column(String, default="", nullable=False)
    confidence   = Column(Float, default=0.0, nullable=False)
    status       = Column(SQLEnum(TicketStatus), default=TicketStatus.pending, nullable=False)

    # NEW: relationship to comments
    comments     = relationship(
        "Comment",
        back_populates="ticket",
        cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id         = Column(Integer, primary_key=True, index=True)
    ticket_id  = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    text       = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # back‑reference
    ticket     = relationship("Ticket", back_populates="comments")


def init_db():
    Base.metadata.create_all(bind=engine)


# --- Pydantic schemas ---

class TicketCreate(BaseModel):
    title: str
    description: str
    priority: Optional[str] = "Normal"
    level:    Optional[str] = "Level 1 Support"


class TicketRead(BaseModel):
    id:           int
    title:        str
    description:  str
    created_at:   datetime
    updated_at:   datetime
    priority:     str
    level:        str
    assigned_to:  str
    confidence:   float
    status:       TicketStatus

    class Config:
        orm_mode = True


class CommentCreate(BaseModel):
    text: str


class CommentRead(BaseModel):
    id:         int
    ticket_id:  int
    text:       str
    created_at: datetime

    class Config:
        orm_mode = True
