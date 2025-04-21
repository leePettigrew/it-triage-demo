# backend/Dockerfile

FROM python:3.10-slim

# 1. Set working dir
WORKDIR /app

# 2. Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy application code
COPY . .

# 4. Expose port
EXPOSE 8000

# 5. Default command (used by 'backend' service)
CMD ["uvicorn", "server:asgi_app", "--host", "0.0.0.0", "--port", "8000"]
