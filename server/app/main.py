from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.routers import auth, questions, answers, timeline, users, media
from app.services.scheduler import start_scheduler, shutdown_scheduler

# Ensure local uploads directory exists
uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist
    init_db()
    # Start APScheduler for automated AI question batches and notifications
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Backend API for 365 daily journaling with Claude AI question curation",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers (must precede StaticFiles mount to allow POST /api/media/presign-upload)
app.include_router(auth.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(answers.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(media.router, prefix="/api")

# Mount local media directory for GET static uploads
app.mount("/api/media", StaticFiles(directory="uploads"), name="media")


@app.get("/")
@app.get("/api")
@app.get("/api/")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "model": settings.CLAUDE_MODEL,
    }
