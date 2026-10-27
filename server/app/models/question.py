from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, UniqueConstraint, CheckConstraint, Index, func
from sqlalchemy.orm import relationship
from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    theme_tags = Column(String(512), default="reflection,life", server_default="reflection,life", nullable=True)
    generated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False
    )
    is_served = Column(Boolean, default=True, server_default="true", nullable=False)

    user = relationship("User", back_populates="questions")
    answer = relationship("Answer", back_populates="question", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    notification_logs = relationship("NotificationLog", back_populates="question")

    __table_args__ = (
        UniqueConstraint("user_id", "day_number", name="uq_user_day_number"),
        CheckConstraint("day_number >= 1 AND day_number <= 365", name="ck_question_day_number_range"),
        Index("idx_questions_user_day_desc", "user_id", "day_number"),
    )
