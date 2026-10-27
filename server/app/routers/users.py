from datetime import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.schemas.schemas import UserPreferenceUpdate, UserResponse, UserExportResponse
from app.routers.auth import get_current_user
from app.utils.timezone import validate_timezone

router = APIRouter(prefix="/users", tags=["Users"])


@router.put("/preferences", response_model=UserResponse)
def update_preferences(
    prefs: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if prefs.preferred_journaling_time is not None:
        current_user.preferred_journaling_time = prefs.preferred_journaling_time
        current_user.notification_time_preference = prefs.preferred_journaling_time.strftime("%H:%M")
    elif prefs.notification_time_preference is not None:
        current_user.notification_time_preference = prefs.notification_time_preference
        try:
            parts = [int(p) for p in prefs.notification_time_preference.split(":")]
            current_user.preferred_journaling_time = time(parts[0], parts[1])
        except Exception:
            pass

    if prefs.interests is not None:
        current_user.interests = [i.strip().lower() for i in prefs.interests]

    if prefs.push_token is not None:
        current_user.push_token = prefs.push_token

    if prefs.timezone is not None:
        if not validate_timezone(prefs.timezone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid IANA timezone: '{prefs.timezone}'"
            )
        current_user.timezone = prefs.timezone

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/export", response_model=UserExportResponse)
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exports the user's entire profile, streaks, and memories archive in a single structured JSON bundle."""
    questions = (
        db.query(Question)
        .options(joinedload(Question.answer))
        .filter(Question.user_id == current_user.id)
        .order_by(Question.day_number.asc())
        .all()
    )

    memories_data = []
    answered_count = 0
    for q in questions:
        ans = q.answer
        is_ans = ans is not None and bool(ans.text or ans.photo_url or ans.audio_url)
        if is_ans:
            answered_count += 1

        memories_data.append({
            "day_number": q.day_number,
            "question_text": q.question_text,
            "theme_tags": q.theme_tags,
            "generated_at": q.generated_at.isoformat() if q.generated_at else None,
            "answered": is_ans,
            "answer": {
                "id": ans.id,
                "text": ans.text,
                "photo_url": ans.photo_url,
                "audio_url": ans.audio_url,
                "created_at": ans.created_at.isoformat() if ans.created_at else None
            } if ans else None
        })

    stats = {
        "total_days_active": len(questions),
        "total_memories_saved": answered_count,
        "current_streak": current_user.streak_count,
        "max_streak": current_user.max_streak,
        "last_answered_at": current_user.last_answered_at.isoformat() if current_user.last_answered_at else None,
        "completion_percentage": round((answered_count / 365.0) * 100, 2)
    }

    return UserExportResponse(
        user=UserResponse.from_orm(current_user),
        stats=stats,
        memories=memories_data
    )
