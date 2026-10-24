from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.schemas.schemas import AnswerCreate, AnswerResponse
from app.routers.auth import get_current_user
from app.services.storage import upload_media_file

router = APIRouter(prefix="/answers", tags=["Answers"])


@router.post("", response_model=AnswerResponse)
def submit_answer(
    data: AnswerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submits or updates an answer for a specific daily question."""
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

    # Check if answer exists already (update case)
    existing_answer = db.query(Answer).filter(Answer.question_id == data.question_id).first()
    if existing_answer:
        if data.text is not None:
            existing_answer.text = data.text
        if data.photo_url is not None:
            existing_answer.photo_url = data.photo_url
        if data.audio_url is not None:
            existing_answer.audio_url = data.audio_url
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
    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)
    return new_answer


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Uploads a photo answer to S3/Object Storage or local dev directory."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    contents = await file.read()
    url = upload_media_file(contents, file.filename, file.content_type)
    return {"url": url}


@router.post("/upload-voice")
async def upload_voice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Uploads a voice note audio recording to S3/Object Storage or local dev directory."""
    contents = await file.read()
    url = upload_media_file(contents, file.filename, file.content_type or "audio/webm")
    return {"url": url}
