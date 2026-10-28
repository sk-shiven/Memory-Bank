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
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS configuration
# Explicit origins are required when allow_credentials=True (browsers disallow wildcard "*" with credentials)
default_origins = [
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://memory-bank-shiven123scalers-projects.vercel.app",
    "https://memory-bank-mu.vercel.app",
]
configured_origins = list(settings.ALLOWED_ORIGINS) if hasattr(settings, "ALLOWED_ORIGINS") else []
cors_origins = list(dict.fromkeys(default_origins + configured_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
