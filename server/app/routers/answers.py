from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.schemas.schemas import AnswerCreate, AnswerUpdate, AnswerResponse
from app.routers.auth import get_current_user
from app.services.storage import upload_media_file

router = APIRouter(prefix="/answers", tags=["Answers"])

MAX_PHOTO_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_VOICE_SIZE = 25 * 1024 * 1024  # 25 MB

ALLOWED_PHOTO_MIMES = {
    "image/jpeg", "image/png", "image/webp", "image/heic"
}
ALLOWED_VOICE_MIMES = {
    "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-m4a"
}


@router.post("", response_model=AnswerResponse)
def submit_answer(
    data: AnswerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submits or updates an answer for a specific daily question."""
    if not (data.text or data.photo_url or data.audio_url):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one memory format (text, photo, or audio) must be provided."
        )

    question = (
        db.query(Question)
        .filter(Question.id == data.question_id, Question.user_id == current_user.id)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found or does not belong to the user"
        )

    now_utc = datetime.now(timezone.utc)

    # Check if answer exists already (update case)
    existing_answer = db.query(Answer).filter(Answer.question_id == data.question_id).first()
    if existing_answer:
        if data.text is not None:
            existing_answer.text = data.text
        if data.photo_url is not None:
            existing_answer.photo_url = data.photo_url
        if data.audio_url is not None:
            existing_answer.audio_url = data.audio_url
        current_user.last_answered_at = now_utc
        db.commit()
        db.refresh(existing_answer)
        return existing_answer

    # Create new answer
    new_answer = Answer(
        question_id=data.question_id,
        user_id=current_user.id,
        text=data.text,
        photo_url=data.photo_url,
        audio_url=data.audio_url
    )
    current_user.last_answered_at = now_utc
    current_user.streak_count = (current_user.streak_count or 0) + 1
    if current_user.streak_count > (current_user.max_streak or 0):
        current_user.max_streak = current_user.streak_count

    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)
    return new_answer


@router.get("/{id}", response_model=AnswerResponse)
def get_answer(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a specific memory by answer ID, strictly scoped to the authenticated user."""
    answer = db.query(Answer).filter(Answer.id == id, Answer.user_id == current_user.id).first()
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found"
        )
    return answer


@router.put("/{id}", response_model=AnswerResponse)
def update_answer(
    id: int,
    data: AnswerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates an existing memory answer belonging to the authenticated user."""
    answer = db.query(Answer).filter(Answer.id == id, Answer.user_id == current_user.id).first()
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found"
        )

    if data.text is not None:
        answer.text = data.text
    if data.photo_url is not None:
        answer.photo_url = data.photo_url
    if data.audio_url is not None:
        answer.audio_url = data.audio_url

    db.commit()
    db.refresh(answer)
    return answer


@router.delete("/{id}")
def delete_answer(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes an answer belonging to the authenticated user."""
    answer = db.query(Answer).filter(Answer.id == id, Answer.user_id == current_user.id).first()
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found"
        )

    db.delete(answer)
    db.commit()
    return {"status": "deleted", "id": id}


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Uploads a photo memory with strict MIME type and 10MB size validation."""
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_PHOTO_MIMES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type '{content_type}'. Allowed: {sorted(list(ALLOWED_PHOTO_MIMES))}"
        )

    contents = await file.read()
    if len(contents) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Photo size exceeds maximum allowed limit of {MAX_PHOTO_SIZE // (1024 * 1024)}MB."
        )

    url = upload_media_file(contents, file.filename or "photo.jpg", content_type)
    return {"url": url}


@router.post("/upload-voice")
async def upload_voice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Uploads a voice note audio recording with strict MIME type and 25MB size validation."""
    content_type = (file.content_type or "audio/webm").lower()
    if content_type not in ALLOWED_VOICE_MIMES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported audio type '{content_type}'. Allowed: {sorted(list(ALLOWED_VOICE_MIMES))}"
        )

    contents = await file.read()
    if len(contents) > MAX_VOICE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Audio size exceeds maximum allowed limit of {MAX_VOICE_SIZE // (1024 * 1024)}MB."
        )

    url = upload_media_file(contents, file.filename or "voice.webm", content_type)
    return {"url": url}
