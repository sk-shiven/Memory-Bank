import math
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.schemas.schemas import TimelineResponse, TimelineItem, AnswerResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/timeline", tags=["Timeline"])


@router.get("", response_model=TimelineResponse)
def get_timeline(
    page: int = Query(1, ge=1, description="Page number starting at 1"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    format: Optional[str] = Query(None, pattern="^(all|text|photo|audio)$", description="Filter by format"),
    theme: Optional[str] = Query(None, description="Filter by theme tag"),
    search: Optional[str] = Query(None, description="Search reflections and prompts"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches the user's journal timeline with pagination and format/theme/search filters."""
    query = (
        db.query(Question)
        .options(joinedload(Question.answer))
        .filter(Question.user_id == current_user.id)
    )

    # 1. Theme Filter
    if theme:
        query = query.filter(Question.theme_tags.ilike(f"%{theme.strip()}%"))

    # 2. Search Filter (Questions or Answers)
    if search:
        search_term = f"%{search.strip()}%"
        # Outer join answer to allow searching answer text as well
        query = query.outerjoin(Question.answer).filter(
            (Question.question_text.ilike(search_term)) |
            (Answer.text.ilike(search_term))
        )

    # 3. Format Filter
    if format and format != "all":
        query = query.join(Question.answer)
        if format == "photo":
            query = query.filter(Answer.photo_url.isnot(None), Answer.photo_url != "")
        elif format == "audio":
            query = query.filter(Answer.audio_url.isnot(None), Answer.audio_url != "")
        elif format == "text":
            query = query.filter(Answer.text.isnot(None), Answer.text != "")

    all_questions = query.order_by(Question.day_number.asc()).all()

    total_items = len(all_questions)
    total_pages = max(1, math.ceil(total_items / limit))
    offset = (page - 1) * limit
    paged_questions = all_questions[offset:offset + limit]

    items = []
    answered_count = 0
    for q in all_questions:
        ans = q.answer
        if ans and (ans.text or ans.photo_url or ans.audio_url):
            answered_count += 1

    for q in paged_questions:
        answer = q.answer
        is_answered = answer is not None and bool(answer.text or answer.photo_url or answer.audio_url)
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

    current_day = max([q.day_number for q in all_questions], default=1)

    return TimelineResponse(
        total_memories=answered_count,
        current_day=current_day,
        page=page,
        limit=limit,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
        memories=items
    )
