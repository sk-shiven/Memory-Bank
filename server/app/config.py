from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

_env_file = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "365 Journal API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite:///./memory_bank.db"
    
    # Auth
    JWT_SECRET: str = "365-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_DAYS: int = 30
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # Anthropic / Claude
    ANTHROPIC_API_KEY: Optional[str] = None
    CLAUDE_MODEL: str = "claude-haiku-4-5-20251001"
    
    # S3 Storage (AWS S3 or Oracle Object Storage)
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "365-media"
    S3_REGION_NAME: Optional[str] = None
    S3_USER_ARN: Optional[str] = None
    
    # Firebase Cloud Messaging
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None

    class Config:
        env_file = (str(_env_file), ".env")
        case_sensitive = True
        extra = "ignore"


settings = Settings()
