#!/bin/sh
set -e

echo "Starting 365 Backend API..."

# Run database migrations
if [ -f "/app/alembic.ini" ]; then
    echo "Running database migrations (Alembic)..."
    alembic upgrade head || echo "Alembic upgrade encountered a non-fatal warning, continuing..."
fi

# Execute main CMD
exec "$@"
