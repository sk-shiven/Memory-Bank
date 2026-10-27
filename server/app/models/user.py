from datetime import datetime, time, timezone
from sqlalchemy import Column, Integer, String, DateTime, Time, JSON, Index, func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(1024), nullable=True)
    timezone = Column(String(50), default="UTC", server_default="UTC", nullable=False)
    notification_time_preference = Column(String(10), default="20:00", server_default="20:00", nullable=False)
    preferred_journaling_time = Column(Time, default=time(20, 0), server_default="20:00:00", nullable=False)
    interests = Column(
        JSON,
        default=lambda: ["mindfulness", "gratitude"],
        server_default='["mindfulness", "gratitude"]',
        nullable=False
    )
    push_token = Column(String(1024), nullable=True)
    streak_count = Column(Integer, default=0, server_default="0", nullable=False)
    max_streak = Column(Integer, default=0, server_default="0", nullable=False)
    last_answered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False
    )

    questions = relationship("Question", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    answers = relationship("Answer", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    notification_logs = relationship("NotificationLog", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (
        Index("idx_users_notification_dispatch", "timezone", "preferred_journaling_time"),
    )
