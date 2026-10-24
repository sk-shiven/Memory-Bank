from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# --- Auth & User ---
class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token


class DemoAuthRequest(BaseModel):
    email: EmailStr = "shiven@example.com"
    name: str = "Shiven Kathuria"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: Optional[str]
    email: str


class UserPreferenceUpdate(BaseModel):
    notification_time_preference: str = "20:00"
    push_token: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    notification_time_preference: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Answers ---
class AnswerCreate(BaseModel):
    question_id: int
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
    memories: List[TimelineItem]
