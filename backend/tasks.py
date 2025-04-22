import os
import json
import re
import numpy as np
from celery import Celery
from sqlalchemy.orm import Session
import openai

from models import SessionLocal, Ticket, TicketStatus

# 1) Celery broker & backend
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery    = Celery("tasks", broker=redis_url, backend=redis_url)

# 2) Instantiate the OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 3) Prototype JSON files
PROTOTYPE_FILES = {
    "Hardware Team": "Hardware.json",
    "Software Team": "Software.json",
    "Network Team":  "Network.json",
    "Security Team": "Security.json",
    "HR Team":       "HR.json",
}

TOP_K = 5  # number of neighbors for voting


def clean_text(text: str) -> str:
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\S+@\S+', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def load_prototypes():
    """
    Load all tickets from JSON, embed them, apply anisotropy fix,
    and return (names_list, vectors_array, global_mean).
    """
    names = []
    vecs  = []
    for team, fname in PROTOTYPE_FILES.items():
        path = os.path.join(os.path.dirname(__file__), fname)
        with open(path, encoding="utf-8") as f:
            tickets = json.load(f)
        texts = [f"{t['title']}. {t['description']}" for t in tickets]
        resp = client.embeddings.create(
            model="text-embedding-ada-002",
            input=texts
        )
        for item in resp.data:
            vecs.append(np.array(item.embedding))
            names.append(team)
    V = np.vstack(vecs)
    mean = V.mean(axis=0, keepdims=True)
    V = (V - mean) / np.linalg.norm(V, axis=1, keepdims=True)
    return names, V, mean


def ml_route(text: str) -> tuple[str, float]:
    """Return (team, confidence) using fresh prototypes each call."""
    clean = clean_text(text)

    # 1) Load & embed prototypes
    names, V, mean = load_prototypes()

    # 2) Embed incoming ticket
    resp = client.embeddings.create(
        model="text-embedding-ada-002",
        input=[clean]
    )
    qv = np.array(resp.data[0].embedding)
    qv = (qv - mean.ravel()) / (np.linalg.norm(qv) + 1e-8)

    # 3) Compute similarities & pick top-K
    sims = (V @ qv) / (np.linalg.norm(V, axis=1) * np.linalg.norm(qv) + 1e-8)
    idxs = sims.argsort()[-TOP_K:][::-1]

    # 4) Few-shot prompt construction
    shots = [
        {"title": names[i], "description": "...", "team": names[i]}
        for i in idxs
    ]
    examples = "\n".join(f"{j+1}) {json.dumps(shots[j])}" for j in range(len(shots)))
    prompt = (
        "Here are past tickets and their teams:\n"
        + examples
        + f"\nClassify this ticket:\n{json.dumps({'title': clean})}\n"
        + "Respond only with JSON: {\"team\": \"<team>\"}."
    )

    # 5) GPT-4.1 returns the team
    gpt = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role":"system","content":"You are an IT‑Triage classifier."},
            {"role":"user","content":prompt}
        ],
        temperature=0.0
    )
    team = json.loads(gpt.choices[0].message.content.strip()).get("team", "Manual Review")

    # 6) Confidence = fraction of top-K that match GPT’s pick
    votes = sum(1 for i in idxs if names[i] == team)
    return team, votes / TOP_K


def ai_assign_priority_and_level(text: str) -> tuple[str, str]:
    system = (
        "You are an IT‑Triage assistant. "
        "Given a ticket title and description, choose:\n"
        "1) priority: one of [Low, Medium, High, Urgent]\n"
        "2) support level: one of [Tier 1, Tier 2, Tier 3]\n"
        "Respond only with JSON: {\"priority\":…, \"level\":…}."
    )
    prompt = f"TITLE: {text[:2000]}"
    resp = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role":"system","content":system},
            {"role":"user","content":prompt}
        ],
        temperature=0.0,
        max_tokens=60
    )
    try:
        data = json.loads(resp.choices[0].message.content.strip())
        return data.get("priority","Medium"), data.get("level","Tier 1")
    except:
        return "Medium","Tier 1"

@celery.task
def classify_ticket(ticket_id: int):
    db: Session = SessionLocal()
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        db.close()
        return

    text = f"{ticket.title}. {ticket.description}"
    team, conf = ml_route(text)
    ticket.assigned_to = team
    ticket.confidence  = conf
    ticket.status      = TicketStatus.routed

    pri, lvl = ai_assign_priority_and_level(text)
    ticket.priority = pri
    ticket.level    = lvl

    db.commit()
    db.refresh(ticket)
    db.close()

    from server import sio
    sio.start_background_task(
        sio.emit,
        "ticket_routed",
        {
            "id":          ticket.id,
            "title":       ticket.title,
            "description": ticket.description,
            "priority":    ticket.priority,
            "level":       ticket.level,
            "assigned_to": ticket.assigned_to,
            "confidence":  ticket.confidence,
            "status":      ticket.status.value,
            "created_at":  ticket.created_at.isoformat(),
        }
    )
