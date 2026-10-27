from datetime import datetime, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, field_validator

AVAILABLE_INTERESTS = [
    "mindfulness",     # Mindfulness & Inner Calm
    "growth",          # Personal Growth & Self-Improvement
    "relationships",   # Relationships, Family & Deep Connection
    "creativity",      # Creativity & Artistic Expression
    "gratitude",       # Gratitude & Everyday Joy
    "career",          # Career, Ambition & Purpose
    "philosophy",      # Philosophy, Ethics & Wisdom
    "health",          # Physical Health & Vitality
    "memories",        # Nostalgia, Childhood & Roots
    "adventure",       # Curiosity, Travel & Exploration
]


def _validate_interests_list(v: Optional[List[str]]) -> Optional[List[str]]:
    if v is not None:
        if len(v) == 0:
            raise ValueError("Must select at least 1 interest if specifying interests.")
        if len(v) > 5:
            raise ValueError("Cannot select more than 5 interests.")
        for item in v:
            clean_item = item.strip().lower()
            if clean_item not in AVAILABLE_INTERESTS:
                raise ValueError(f"'{item}' is not a valid interest. Choose from: {AVAILABLE_INTERESTS}")
    return v


# --- Auth & User ---
class UserLoginRequest(BaseModel):
    username_or_email: str
    password: str


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = "Memory Explorer"


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token


class DemoAuthRequest(BaseModel):
    email: EmailStr = "shiven@example.com"
    name: str = "Shiven Kathuria"
    timezone: Optional[str] = "UTC"
    interests: Optional[List[str]] = None

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v):
        return _validate_interests_list(v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: Optional[str]
    email: str


class UserPreferenceUpdate(BaseModel):
    notification_time_preference: Optional[str] = "20:00"
    preferred_journaling_time: Optional[time] = None
    push_token: Optional[str] = None
    timezone: Optional[str] = None
    interests: Optional[List[str]] = None

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v):
        return _validate_interests_list(v)


class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    timezone: str = "UTC"
    notification_time_preference: str = "20:00"
    preferred_journaling_time: time = time(20, 0)
    interests: List[str] = ["mindfulness", "gratitude"]
    streak_count: int = 0
    max_streak: int = 0
    last_answered_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Answers ---
class AnswerCreate(BaseModel):
    question_id: int
    text: Optional[str] = None
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None


class AnswerUpdate(BaseModel):
    text: Optional[str] = None
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None


class AnswerResponse(BaseModel):
    id: int
    question_id: int
    text: Optional[str] = None
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Questions ---
class QuestionResponse(BaseModel):
    id: int
    day_number: int
    question_text: str
    theme_tags: Optional[str] = None
    generated_at: datetime
    answer: Optional[AnswerResponse] = None

    class Config:
        from_attributes = True


# --- Timeline ---
class TimelineItem(BaseModel):
    day_number: int
    question_id: int
    question_text: str
    theme_tags: Optional[str] = None
    answered: bool
    answer: Optional[AnswerResponse] = None
    date: datetime

    class Config:
        from_attributes = True


class TimelineResponse(BaseModel):
    total_memories: int
    current_day: int
    page: int = 1
    limit: int = 20
    total_pages: int = 1
    has_next: bool = False
    has_prev: bool = False
    memories: List[TimelineItem]


# --- Media & Presigned Uploads ---
class PresignedUploadRequest(BaseModel):
    filename: str
    content_type: str
    media_type: str = "photo"  # "photo" or "voice"


class PresignedUploadResponse(BaseModel):
    upload_url: str
    public_url: str
    method: str = "PUT"
    headers: Dict[str, str] = {}


# --- User Archive / Export ---
class UserExportResponse(BaseModel):
    user: UserResponse
    stats: Dict[str, Any]
    memories: List[Dict[str, Any]]
