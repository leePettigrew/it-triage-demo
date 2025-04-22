
# IT Ticket Triage Automation

**IT Ticket Triage Automation** is a web-based system that uses AI (GPT-4) to automatically classify and route incoming IT support tickets to the appropriate teams. It streamlines the helpdesk triage process by analyzing ticket descriptions, determining the best-suited team (e.g., Hardware, Software, Network, etc.), assigning a priority level, and providing real-time updates to users. This project demonstrates an end-to-end pipeline with a FastAPI backend, Celery task queue, Redis messaging, and a React frontend for a responsive, developer-friendly interface.

## Key Features

- **AI-Powered Classification & Routing:** Utilizes OpenAI GPT-4 to understand the ticket’s title and description. Each new ticket is analyzed and automatically assigned to the most relevant support team (Hardware, Software, Network, Security, HR) with high accuracy.
- **Priority and Tier Suggestion:** Determines the ticket’s urgency (Low, Medium, High, Urgent) and support level (Tier 1, Tier 2, Tier 3) using GPT-4, ensuring the ticket is handled with appropriate priority and expertise.
- **Real-Time Updates:** Integrates Socket.IO for instant notifications. As soon as a ticket is classified and routed by the background AI task, a WebSocket event notifies the frontend to update the ticket’s status and assignment in real-time – no page refresh needed.
- **Asynchronous Processing:** Offloads heavy AI computations to a Celery worker. The FastAPI server remains snappy and responsive, queuing ticket classification tasks to Celery (with Redis as the broker) so users can continue submitting tickets without delay.
- **Persistent Ticket Store:** Uses SQLite (via SQLAlchemy ORM) to store tickets and comments. This ensures that all tickets (and any discussion on them) are saved, and it allows easy switching to another database by changing a configuration.
- **Commenting System:** Support agents can post internal comments on tickets via the API. New comments are broadcast in real-time to other clients, facilitating collaboration on ticket resolution.
- **Continuous Learning:** When tickets are closed, their data is archived to team-specific JSON files. These serve as a growing knowledge base of resolved issues, which the system can use to refine future classifications (by expanding the prototype examples for the embedding model).

## Technologies Used

- **FastAPI:** Python web framework serving a RESTful API for ticket and comment management. Also hosts the Socket.IO ASGI app for real-time communication.
- **Celery:** Distributed task queue that executes ticket classification jobs in the background. Ensures AI processing (embedding and GPT-4 calls) runs asynchronously.
- **Redis:** In-memory data store used as the message broker and result backend for Celery tasks. Coordinates communication between FastAPI and Celery worker processes.
- **OpenAI GPT-4:** Advanced language model (via OpenAI’s API) powering the intelligent triage – used to classify tickets into teams and suggest priority and tier in JSON format.
- **NumPy & Embeddings:** Generates text embeddings (using OpenAI’s `text-embedding-ada-002` model) for ticket descriptions and a library of prototype tickets, enabling a similarity-based pre-classification step to assist GPT-4.
- **React & TypeScript:** Frontend UI for users to create tickets and monitor their status. Implements a dashboard with forms and ticket lists, updating live via hooks that connect to the WebSocket backend.
- **Socket.IO:** Real-time bi-directional communication between frontend and backend (over WebSockets). Used here to push events like `ticket_routed` (when AI routing is complete) and `new_comment` (when someone adds a comment) to all connected clients.
- **SQLAlchemy + Pydantic:** ORM for defining the data models (Ticket, Comment) and schemas. Facilitates database interactions and enforces data schemas for API requests/responses.
- **Docker & Docker Compose:** Containerization of the backend and worker services for easy deployment. Docker Compose orchestrates the FastAPI server, Celery worker, and Redis for a seamless local setup.

## Architecture & Workflow

This project follows a modular, event-driven architecture to achieve responsive AI-driven ticket triage:

1. **Ticket Submission (Frontend/API):** A user fills out a new support ticket (title, description, etc.) on the React frontend (or via an API call). When submitted, the frontend issues a `POST /tickets` request to the FastAPI backend. The ticket is stored in the SQLite database with a status of **`pending`** and immediately returned in the API response for immediate feedback on the UI. At this point, no AI processing has occurred yet (the ticket has not been assigned to a team).

2. **Background Classification (Celery Worker):** Upon receiving the new ticket, the FastAPI backend enqueues a Celery task `classify_ticket` (with the new ticket’s ID). The Celery worker, running in a separate process, picks up this job from Redis. This allows the main API server to quickly respond to the user without waiting for AI classification to finish.

3. **AI Processing (GPT-4 & Embeddings):** The Celery task loads a set of **prototype tickets** for each team (pre-defined examples stored in JSON files). It computes text embeddings for these examples and for the new ticket’s content using OpenAI’s embedding model. By comparing similarity, it selects the top candidate teams and constructs a few-shot prompt. This prompt, along with the new ticket details, is sent to **GPT-4**. GPT-4 returns a classification – essentially, it suggests which team should handle the ticket (encapsulated in a JSON response). The system also calls GPT-4 to get a recommended priority and support tier for the ticket. The result of this AI decision is a team name (e.g., `"Hardware Team"`) and a confidence score for that assignment, as well as a priority (e.g., `"High"`) and level (`"Tier 2"`).

4. **Database Update & Routing:** The Celery task updates the ticket’s record in the database with the AI-derived information: it sets the `assigned_to` field to the chosen team, the `confidence` to the computed confidence score, the `priority` and `level` to the AI-suggested values, and changes the ticket’s status from **`pending`** to **`routed`** (indicating it has been automatically routed to a support team). If the ticket was initially created with a placeholder priority/level, those are now overridden by the AI suggestions.

5. **Real-Time Notification:** After updating the database, the backend (still within the Celery task) emits a WebSocket event. Using a background Socket.IO task (via FastAPI’s `socketio.AsyncServer` integration), it broadcasts a **`ticket_routed`** event to all connected clients, along with the ticket’s full data (id, title, description, assigned team, confidence, priority, level, status, timestamps, etc.). This event allows any frontend to immediately know that this particular ticket has been classified and updated.

6. **Frontend Update:** The React frontend, which subscribes to WebSocket events, receives the `ticket_routed` event. A custom React hook (`useSocket`) listens for this event and triggers a state update. The ticket list in the UI is updated in real-time: the ticket moves from the “Pending” list to the “Routed” list (or its displayed status/assignment changes), usually within a few seconds of submission. This real-time feedback ensures users or support agents see triage decisions almost instantly. If multiple team tabs or filters are present, the ticket will now appear under its assigned team’s view.

7. **Ticket Lifecycle:** Support agents can review the routed tickets and proceed with resolution. They may add internal comments using the `POST /tickets/{id}/comments` API – which triggers a `new_comment` WebSocket event to update any open client views of that ticket’s discussion. Tickets can be closed by updating their status via `PATCH /tickets/{id}/status` (setting status to `closed`). Upon closing a ticket, the backend will append the ticket’s details to a historical JSON file for the assigned team (e.g., adding to `Hardware.json` if the ticket was assigned to "Hardware Team"). This mechanism gradually builds a knowledge base of resolved tickets that can be used to improve the model (the prototype examples) over time.

The separation of concerns in this architecture means the web API and UI remain **fast and interactive**, while the heavy AI lifting happens asynchronously. The use of WebSocket events keeps the system user-friendly and real-time, which is crucial in a support setting. Developers can scale each component (add more Celery workers, switch out models, etc.) independently as needed.

## Project Structure

Below is a high-level overview of the repository structure and key files:

```plaintext
├── backend/
│   ├── server.py          # FastAPI application (routes, Socket.IO setup, CORS, etc.)
│   ├── models.py          # Database models (SQLAlchemy) and Pydantic schemas
│   ├── tasks.py           # Celery tasks for AI classification (GPT-4 calls, embeddings)
│   ├── requirements.txt   # Python dependencies for backend/worker
│   ├── Hardware.json      # Sample ticket prototypes for "Hardware Team" (used by AI)
│   ├── Software.json      # Sample ticket prototypes for "Software Team"
│   ├── ... (other team JSON files and utility modules)
│   └── Dockerfile         # Docker image for FastAPI app and Celery worker (shared context)
├── frontend/
│   ├── src/
│   │   ├── app/page.tsx   # Main React page (ticket dashboard UI)
│   │   ├── components/    # React components (TicketCard, Tabs, etc.)
│   │   ├── hooks/         # Custom React hooks (e.g., useTickets for polling, useSocket for WS)
│   │   └── types/         # TypeScript type definitions (e.g., Ticket type shape)
│   ├── public/            # Public assets (if any)
│   ├── package.json       # Frontend dependencies and scripts
│   └── ... (build config, etc.)
├── infra/
│    └──  docker-compose.yml # Docker Compose configuration to run backend, worker, and Redis     
└── README.md              # Project documentation (this file)
```

**Note:** The frontend is a React application (built with Next.js 13+ in this structure, using the `app` directory). The backend and Celery worker share the same codebase (mounted via volume in Docker or run from the same directory in development), and both use the `backend/Dockerfile` for the image. The JSON files (e.g., `Hardware.json`) contain example tickets that guide the ML routing logic.

## Installation and Setup

You can run the IT Ticket Triage system either with **Docker Compose** (recommended for an easy start) or set it up manually on your local machine. In all cases, you will need an OpenAI API key to enable GPT-4 functionality.

### Prerequisites

- **OpenAI API Key:** Sign up for an OpenAI account and obtain an API key with access to the GPT-4 model. This will be used by the backend to call the OpenAI API. Keep this key handy for configuration.
- For Docker deployment: **Docker** and **Docker Compose** installed on your system.
- For manual setup: **Python 3.10+**, and optionally **Node.js 18+** (if you plan to run the React frontend locally outside of Docker).

### Running with Docker Compose

1. **Clone the Repository:**  
   ```bash
   git clone https://github.com/leePettigrew/it-triage-demo.git
   cd it-ticket-triage
   ```

2. **Configure Environment Variables:**  
   Create a file named `.env` in the `backend/` directory (this will be automatically used by Docker Compose to load environment variables for the backend and worker containers). Inside `.env`, add your configuration, for example:  
   ```bash
   OPENAI_API_KEY=<your-openai-api-key>
   # (Optional) DATABASE_URL=sqlite:///./tickets.db  # default is fine for local use
   # (Optional) REDIS_URL=redis://redis:6379/0       # default as per docker-compose
   ```  
   By default, the backend will use a SQLite database file (`tickets.db`) in the `backend/` directory. The Redis service is configured by default via Docker Compose.

3. **Start the Services:**  
   Use Docker Compose to build and run the containers:  
   ```bash
   cd infra
   docker-compose up --build
   ```  
   This will launch three containers:
   - **redis:** Redis server (on port 6379) for the message broker.
   - **backend:** FastAPI app server (listening on port 8000).
   - **worker:** Celery worker process that will consume classification tasks.  

   The FastAPI server will be available at `http://localhost:8000`. You should see console logs from Uvicorn startup, and Celery worker logs indicating it’s ready for tasks.  

4. **Run the Frontend:**  
   The Docker Compose setup above does not include the React frontend (to facilitate hot-reloading in development). To start the frontend:
   - Ensure you have Node.js and npm installed.
   - Open a new terminal on your host machine (still in the project directory) and go to the frontend folder, then install dependencies and start the dev server:  
     ```bash
     cd frontend/
     npm install
     npm run dev
     ```  
     This will start the React app (likely on `http://localhost:3000`). The frontend is already configured to communicate with the backend at `http://localhost:8000` for API calls and WebSocket connections.

5. **Access the Application:**  
   - Open your browser to **`http://localhost:3000`** to view the ticket dashboard UI. You can create new tickets and watch them get classified in real-time.  
   - (If you prefer to test via API directly, you can use `http://localhost:8000/docs` for the automatic Swagger UI provided by FastAPI, or send requests with a tool like curl/Postman as shown below.)

Docker will handle setting up the environment, so you don’t need to manually install Python packages or run a Redis server — those are encapsulated in the containers.

### Manual Setup (Local Python environment)

Follow these steps if you wish to run the backend and worker on your local machine without Docker (for development or exploration):

1. **Start Redis:** Make sure you have a Redis server running on `localhost:6379`. You can install Redis locally or use Docker just for Redis:  
   ```bash
   docker run -p 6379:6379 redis:6-alpine
   ```  
   *(Alternatively, if you prefer not to use Redis, you could configure Celery to use a different broker/back end that you have available.)*

2. **Backend Setup:**  
   - Navigate to the `backend/` directory in the project.  
   - Create and activate a Python virtual environment (optional but recommended):  
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```  
   - Install the required Python packages:  
     ```bash
     pip install -r requirements.txt
     ```  
   - Set environment variables for the backend. At minimum, you need to provide the `OPENAI_API_KEY`. You can do this in your shell or by creating a `.env` file and loading it. For example in Unix:  
     ```bash
     export OPENAI_API_KEY=<your-openai-api-key>
     export DATABASE_URL=sqlite:///./tickets.db   # or another database URL if desired
     export REDIS_URL=redis://localhost:6379/0    # Ensure it matches your Redis instance
     ```  
     (The above variables correspond to those used in `server.py` and `tasks.py`. If not set, `DATABASE_URL` will default to the local SQLite file and `REDIS_URL` will default to `redis://redis:6379/0`. When running outside Docker, set REDIS_URL to your local Redis.)

   - Initialize the database (optional): The FastAPI app will create the SQLite database and tables on startup, but you can also pre-create them by running an interactive session:
     ```bash
     python -c "from models import init_db; init_db()"
     ```
     This will generate `tickets.db` with the necessary schema.

3. **Start the Backend Server:**  
   Still in the `backend/` directory, launch the FastAPI server with Uvicorn:  
   ```bash
   uvicorn server:asgi_app --reload --port 8000
   ```  
   The API should now be running at `http://127.0.0.1:8000` (CORS is configured to allow the React app on port 3000). The `--reload` flag makes the server auto-restart on code changes, useful for development.

4. **Start the Celery Worker:**  
   In a **separate terminal**, ensure your environment (virtual env and env vars) is activated, then start the Celery worker:  
   ```bash
   celery -A tasks worker --loglevel=info
   ```  
   This command tells Celery to use the `tasks.py` module (`-A tasks`) to find the task definitions, and to start a worker listening on the Redis broker. You should see output confirming the worker is ready and connected.  
   *Keep this process running*, as it will execute the AI classification jobs whenever a new ticket is created.

5. **Run the Frontend (Dev Mode):**  
   If you want to use the React UI, open another terminal and navigate to `frontend/`. Make sure you have all dependencies installed (`npm install`). Then start the development server:  
   ```bash
   npm run dev
   ```  
   This should start the app on `http://localhost:3000`. The React app expects the backend at `http://localhost:8000`, so ensure that’s running as above. You can now open your browser to the React app and use the interface.

6. **Test the Setup:**  
   Create a test ticket via the UI or via API. For example, using `curl` from a terminal (replace `<...>` with your own text):
   ```bash
   curl -X POST http://localhost:8000/tickets \
        -H "Content-Type: application/json" \
        -d '{"title": "Printer issue", "description": "The office printer is not responding.", "priority": "Normal", "level": "Level 1 Support"}'
   ```  
   You should receive a JSON response of the newly created ticket (status will be "pending"). After a few seconds, the Celery worker will process it – check the worker’s console for logs of the classification – and the ticket’s status and fields will update (either via the frontend automatically, or by fetching the ticket again via the API).

## API Usage Examples

Once the system is running, you can interact with the API endpoints to manage tickets and comments. Below are some common use-case examples:

- **Create a New Ticket:** `POST /tickets`  
  Send a JSON payload with at least a `title` and `description` (you can also specify an initial `priority` and `level`, or omit them to use defaults). For example:

  ```http
  POST /tickets
  Content-Type: application/json

  {
    "title": "Printer not working",
    "description": "The main office printer refuses to print any documents.",
    "priority": "Normal",
    "level": "Level 1 Support"
  }
  ```

  **Response:** On success, returns `201 Created` with the ticket data in JSON format. For example: 

  ```json
  {
    "id": 7,
    "title": "Printer not working",
    "description": "The main office printer refuses to print any documents.",
    "created_at": "2025-04-22T12:30:45.123Z",
    "updated_at": "2025-04-22T12:30:45.123Z",
    "priority": "Normal",
    "level": "Level 1 Support",
    "assigned_to": "",
    "confidence": 0.0,
    "status": "pending"
  }
  ```

  The ticket is now in the system with a unique `id`. Notice `status` is `"pending"` and `assigned_to` is empty initially. This response is also immediately reflected in the frontend UI (e.g., it will appear in a "Pending Tickets" list).

- **Automated Routing Result:** After a short delay (typically a couple of seconds), the Celery worker will finish processing the new ticket. The backend will update the ticket’s record and emit a WebSocket event. If you query the API again for this ticket (or all tickets), you will see the updated information. For example, a subsequent `GET /tickets` might show:

  ```json
  {
    "id": 7,
    "title": "Printer not working",
    "description": "The main office printer refuses to print any documents.",
    "created_at": "2025-04-22T12:30:45.123Z",
    "updated_at": "2025-04-22T12:30:50.456Z",
    "priority": "Medium",
    "level": "Tier 1",
    "assigned_to": "Hardware Team",
    "confidence": 0.8,
    "status": "routed"
  }
  ```

  Now the ticket has been **auto-classified**: it was assigned to the **Hardware Team** with a confidence of 0.8 (80% similarity/confidence in this choice). The priority was elevated to "Medium" and level adjusted to "Tier 1" by the AI. The `status` is now `"routed"`, indicating it’s been routed to the appropriate team. If you had the React app open, this change would have happened in real-time (the ticket would move from pending to routed, possibly highlighted under the "Hardware" team tab).

- **Listing Tickets:** `GET /tickets`  
  Retrieves all tickets in the system (optionally, you could filter on the frontend by team or status). The response is a list of ticket objects similar to the above. This is used by the frontend to display the ticket dashboard. Example (truncated for brevity):

  ```json
  [
    {
      "id": 7,
      "title": "Printer not working",
      "description": "The main office printer refuses to print any documents.",
      "created_at": "2025-04-22T12:30:45.123Z",
      "updated_at": "2025-04-22T12:30:50.456Z",
      "priority": "Medium",
      "level": "Tier 1",
      "assigned_to": "Hardware Team",
      "confidence": 0.8,
      "status": "routed"
    },
    {
      "id": 6,
      "title": "Cannot connect to VPN",
      "description": "VPN client is showing an authentication error...",
      "created_at": "...",
      "updated_at": "...",
      "priority": "High",
      "level": "Tier 2",
      "assigned_to": "Network Team",
      "confidence": 0.9,
      "status": "routed"
    },
    ...
  ]
  ```

- **Posting a Comment:** `POST /tickets/{ticket_id}/comments`  
  Support agents can add internal comments to a ticket (for example, logging troubleshooting steps or handoff notes). To post a comment on ticket #7:

  ```http
  POST /tickets/7/comments
  Content-Type: application/json

  {
    "text": "Rebooted the printer, waiting to see if issue recurs."
  }
  ```

  **Response:** Returns `201 Created` with the comment data:
  ```json
  {
    "id": 3,
    "ticket_id": 7,
    "text": "Rebooted the printer, waiting to see if issue recurs.",
    "created_at": "2025-04-22T13:05:00.789Z"
  }
  ```
  This new comment is also broadcast via WebSocket (`new_comment` event) to update any open views of ticket #7’s discussion in real-time. (Comments can be retrieved with `GET /tickets/7/comments`.)

- **Closing a Ticket:** `PATCH /tickets/{ticket_id}/status`  
  When an issue is resolved, a ticket can be marked as closed. For example:
  ```http
  PATCH /tickets/7/status?status=closed
  ```
  **Response:** Returns the updated ticket object with `status: "closed"`. The backend will also log this closure in the team’s JSON file (e.g., adding this ticket to `Hardware.json`). *Future model runs could incorporate this data to improve routing decisions.*

These examples illustrate how the system is used. The FastAPI backend also provides an interactive API docs UI at **`/docs`** (Swagger UI) and **`/redoc`** for convenience, where you can try out these endpoints and see the schemas.

## Notes on Extensibility

- **Model and Data Updates:** The AI logic is designed to improve over time. You can add more sample tickets to the prototype JSON files to give the model better context for each team. If you have domain-specific data or want to fine-tune the classification criteria, updating these files (or even training your own model) can be done without changing the application code.
- **Scaling:** In a production scenario, you might run multiple Celery workers to handle high volumes of tickets, and use a more robust database than SQLite. The app is built with scalability in mind – for example, you can switch the database by setting `DATABASE_URL` to a Postgres or MySQL connection, and run the app under a proper ASGI server setup with workers.
- **Error Handling:** If the AI is unsure or the model fails to return a clear answer, the system defaults to assigning a `"Manual Review"` team (as seen in the code). This ensures that no ticket falls through the cracks. Such tickets can be reviewed by a human and manually routed.
- **Security & Auth:** This prototype focuses on functionality and does not include authentication/authorization. In a real deployment, you would likely integrate an auth system (API keys or OAuth for the API, and a login system for the frontend) to restrict access to authorized support staff.

## Conclusion

**IT Ticket Triage Automation** combines modern AI capabilities with a robust web tech stack to dramatically reduce the time it takes to sort and assign support tickets. Developers can learn from this project’s architecture how to integrate AI services (like GPT-4) into a web application, coordinate background processing with Celery, and enable real-time client updates for a seamless user experience. Whether you’re looking to deploy it as a helpdesk tool or to study its design for your own projects, we hope this README and project serve as a valuable reference.

Feel free to explore the code, tweak the configurations (for example, use different models or add more teams), and adapt the system to your needs. Happy triaging!