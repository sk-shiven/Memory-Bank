from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.schemas.schemas import TimelineResponse, TimelineItem, AnswerResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/timeline", tags=["Timeline"])


@router.get("", response_model=TimelineResponse)
def get_timeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches the user's journal timeline of all questions and memories."""
    questions = (
        db.query(Question)
        .filter(Question.user_id == current_user.id)
        .order_by(Question.day_number.asc())
        .all()
    )

    items = []
    answered_count = 0
    for q in questions:
        answer = db.query(Answer).filter(Answer.question_id == q.id).first()
        is_answered = answer is not None and bool(answer.text or answer.photo_url or answer.audio_url)
        if is_answered:
            answered_count += 1

        items.append(
            TimelineItem(
                day_number=q.day_number,
                question_id=q.id,
                question_text=q.question_text,
                theme_tags=q.theme_tags,
                answered=is_answered,
                answer=AnswerResponse.from_orm(answer) if answer else None,
                date=q.generated_at
            )
        )

    current_day = max([q.day_number for q in questions], default=1)

    return TimelineResponse(
        total_memories=answered_count,
        current_day=current_day,
        memories=items
    )
