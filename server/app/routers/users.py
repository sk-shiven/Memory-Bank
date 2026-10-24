from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.schemas import UserPreferenceUpdate, UserResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.put("/preferences", response_model=UserResponse)
def update_preferences(
    prefs: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.notification_time_preference = prefs.notification_time_preference
    if prefs.push_token is not None:
        current_user.push_token = prefs.push_token
    db.commit()
    db.refresh(current_user)
    return current_user
