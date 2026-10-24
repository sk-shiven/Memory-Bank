import os
import uuid
import logging
from pathlib import Path
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from app.config import settings

logger = logging.getLogger(__name__)

LOCAL_UPLOADS_DIR = Path("uploads")
LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def get_s3_client():
    if settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY:
        kwargs = {
            "aws_access_key_id": settings.S3_ACCESS_KEY,
            "aws_secret_access_key": settings.S3_SECRET_KEY,
            "region_name": settings.S3_REGION_NAME or "ap-southeast-2",
        }
        if settings.S3_ENDPOINT_URL:
            kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
        return boto3.client("s3", **kwargs)
    return None


def upload_media_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Uploads a photo or audio file to AWS S3, Oracle Object Storage, or local fallback directory.

    Returns the public/accessible URL or local path.
    """
    ext = os.path.splitext(filename)[1] or (".jpg" if "image" in content_type else ".webm")
    unique_key = f"{uuid.uuid4()}{ext}"

    s3 = get_s3_client()
    if s3:
        try:
            # Try with public-read ACL first (works on Oracle / ACLs-enabled S3)
            try:
                s3.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=unique_key,
                    Body=file_bytes,
                    ContentType=content_type,
                    ACL="public-read"
                )
            except ClientError:
                # If ACLs are disabled in modern AWS S3, upload without ACL
                s3.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=unique_key,
                    Body=file_bytes,
                    ContentType=content_type
                )

            if settings.S3_ENDPOINT_URL:
                return f"{settings.S3_ENDPOINT_URL.rstrip('/')}/{settings.S3_BUCKET_NAME}/{unique_key}"
            region = settings.S3_REGION_NAME or "ap-southeast-2"
            return f"https://{settings.S3_BUCKET_NAME}.s3.{region}.amazonaws.com/{unique_key}"
        except Exception as e:
            logger.warning("S3 upload failed: %s, falling back to local storage", e)

    # Local fallback for dev/testing
    local_path = LOCAL_UPLOADS_DIR / unique_key
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    return f"/api/media/{unique_key}"
