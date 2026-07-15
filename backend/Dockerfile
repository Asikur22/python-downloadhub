FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies, including aria2
RUN apt-get update && apt-get install -y --no-install-recommends \
    aria2 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /backend

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["./entrypoint.sh"]
