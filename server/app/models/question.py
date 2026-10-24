from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    theme_tags = Column(String(512), default="reflection,life", nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_served = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="questions")
    answer = relationship("Answer", back_populates="question", uselist=False, cascade="all, delete-orphan")
