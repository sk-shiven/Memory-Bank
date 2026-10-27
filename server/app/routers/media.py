from fastapi import APIRouter, Depends, HTTPException, status
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.schemas import PresignedUploadRequest, PresignedUploadResponse
from app.services.storage import generate_presigned_upload_url

router = APIRouter(prefix="/media", tags=["Media"])

ALLOWED_MIMES = {
    "image/jpeg", "image/png", "image/webp", "image/heic",
    "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-m4a"
}


@router.post("/presign-upload", response_model=PresignedUploadResponse)
def get_presigned_upload(
    req: PresignedUploadRequest,
    current_user: User = Depends(get_current_user)
):
    """Generates an S3 presigned PUT URL for direct media uploads, bypassing FastAPI memory."""
    if req.content_type.lower() not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported media content-type '{req.content_type}'. Allowed: {sorted(list(ALLOWED_MIMES))}"
        )

    res = generate_presigned_upload_url(
        filename=req.filename,
        content_type=req.content_type,
        media_type=req.media_type
    )
    return res
