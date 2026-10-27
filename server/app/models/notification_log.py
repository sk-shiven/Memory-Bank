from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Time, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), default="sent", nullable=False)
    channel = Column(String(50), default="fcm", nullable=False)
    scheduled_time = Column(Time, nullable=True)
    error_message = Column(Text, nullable=True)
    sent_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False
    )

    user = relationship("User", back_populates="notification_logs")
    question = relationship("Question", back_populates="notification_logs")

    __table_args__ = (
        Index("idx_notification_logs_user_sent", "user_id", "sent_at"),
    )
