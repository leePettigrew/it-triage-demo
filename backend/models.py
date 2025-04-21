# backend/models.py

from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SQLEnum, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from pydantic import BaseModel

# --- SQLAlchemy setup ---
DATABASE_URL = "sqlite:///./tickets.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- ORM model ---
class TicketStatus(str, Enum):
    pending = "pending"
    classified = "classified"
    routed = "routed"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    assigned_to = Column(String, default="", nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.pending, nullable=False)


# Create tables
def init_db():
    Base.metadata.create_all(bind=engine)


# --- Pydantic schemas ---
class TicketCreate(BaseModel):
    text: str


class TicketRead(BaseModel):
    id: int
    text: str
    created_at: datetime
    assigned_to: str
    confidence: float
    status: TicketStatus

    class Config:
        orm_mode = True
