from datetime import datetime, time, timedelta, timezone
import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.schemas import (
    TokenResponse, 
    GoogleAuthRequest, 
    DemoAuthRequest, 
    UserResponse,
    UserLoginRequest,
    UserRegisterRequest
)
from app.utils.timezone import validate_timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency that extracts and validates the JWT token.
    
    Strictly raises 401 Unauthorized if token is missing, invalid, or expired.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials."
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User not found or credentials invalid."
    )


@router.post("/demo", response_model=TokenResponse)
def demo_login(req: DemoAuthRequest, db: Session = Depends(get_db)):
    """One-click developer / demo login for quick testing."""
    user = db.query(User).filter(User.email == req.email).first()
    tz = req.timezone if req.timezone and validate_timezone(req.timezone) else "UTC"
    interests = req.interests if req.interests else ["mindfulness", "gratitude"]
    if not user:
        user = User(
            email=req.email,
            name=req.name,
            timezone=tz,
            notification_time_preference="20:00",
            preferred_journaling_time=time(20, 0),
            interests=interests
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        updated = False
        if req.timezone and validate_timezone(req.timezone) and user.timezone != req.timezone:
            user.timezone = req.timezone
            updated = True
        if req.interests:
            user.interests = req.interests
            updated = True
        if updated:
            db.commit()
            db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email
    )


@router.post("/login", response_model=TokenResponse)
def login_with_password(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates a user with email/username and password, returning a JWT token."""
    login_id = req.username_or_email.strip().lower()
    user = db.query(User).filter(
        (User.email.ilike(login_id)) | (User.name.ilike(login_id))
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password configured for this account. Please sign in with Google or Demo."
        )

    pw_bytes = req.password.encode('utf-8')
    hash_bytes = user.password_hash.encode('utf-8')
    if not bcrypt.checkpw(pw_bytes, hash_bytes):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email
    )


@router.post("/register", response_model=TokenResponse)
def register_with_password(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user with email and password, returning a JWT token."""
    email = req.email.strip().lower()
    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    user = db.query(User).filter(User.email == email).first()
    if user:
        if user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please log in."
            )
        pw_bytes = req.password.encode('utf-8')
        user.password_hash = bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode('utf-8')
        if req.name and not user.name:
            user.name = req.name
        db.commit()
        db.refresh(user)
    else:
        pw_bytes = req.password.encode('utf-8')
        hashed = bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode('utf-8')
        user = User(
            email=email,
            name=req.name or email.split('@')[0],
            password_hash=hashed,
            timezone="UTC",
            notification_time_preference="20:00",
            preferred_journaling_time=time(20, 0),
            interests=["mindfulness", "gratitude"]
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email
    )


@router.post("/google", response_model=TokenResponse)
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Google OAuth login endpoint."""
    raw_token = req.credential or req.token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing credential or token in request body."
        )
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        id_info = id_token.verify_oauth2_token(
            raw_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        email = id_info.get("email")
        name = id_info.get("name")
        picture = id_info.get("picture")
        google_id = id_info.get("sub")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                name=name,
                avatar_url=picture,
                google_id=google_id,
                timezone="UTC",
                notification_time_preference="20:00",
                preferred_journaling_time=time(20, 0),
                interests=["mindfulness", "gratitude"]
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token(user.id, user.email)
        return TokenResponse(
            access_token=token,
            user_id=user.id,
            name=user.name,
            email=user.email
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return user
