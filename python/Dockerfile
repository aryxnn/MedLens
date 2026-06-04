FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy source code and metadata artifacts
COPY app.py .
COPY query.py .
COPY centroids.json .
COPY keywords_cache.json .
COPY preprocessed_db/ ./preprocessed_db/

EXPOSE 8000

# Set environment defaults (can be overridden by Railway)
ENV PORT=8000
ENV USE_BM25=true

CMD ["python3", "app.py"]
