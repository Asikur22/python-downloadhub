#!/bin/bash
set -e

# Wait for database directory to exist
mkdir -p /database

# Run migrations
echo "Checking and running migrations..."
alembic upgrade head

# Start FastAPI backend
echo "Starting FastAPI backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
