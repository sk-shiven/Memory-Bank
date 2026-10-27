import os
import uuid
import logging
from pathlib import Path
from typing import Optional, Dict
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
            try:
                s3.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=unique_key,
                    Body=file_bytes,
                    ContentType=content_type,
                    ACL="public-read"
                )
            except ClientError:
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


def generate_presigned_upload_url(filename: str, content_type: str, media_type: str = "photo") -> Dict[str, str]:
    """Generates an S3 presigned PUT URL for direct-to-S3 client uploads, bypassing server RAM."""
    ext = os.path.splitext(filename)[1] or (".jpg" if media_type == "photo" else ".webm")
    unique_key = f"{uuid.uuid4()}{ext}"

    s3 = get_s3_client()
    if s3:
        try:
            presigned_url = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": settings.S3_BUCKET_NAME,
                    "Key": unique_key,
                    "ContentType": content_type
                },
                ExpiresIn=3600
            )
            region = settings.S3_REGION_NAME or "ap-southeast-2"
            if settings.S3_ENDPOINT_URL:
                public_url = f"{settings.S3_ENDPOINT_URL.rstrip('/')}/{settings.S3_BUCKET_NAME}/{unique_key}"
            else:
                public_url = f"https://{settings.S3_BUCKET_NAME}.s3.{region}.amazonaws.com/{unique_key}"

            return {
                "upload_url": presigned_url,
                "public_url": public_url,
                "method": "PUT",
                "headers": {"Content-Type": content_type}
            }
        except Exception as e:
            logger.warning("Presigned URL generation failed: %s; falling back to direct server upload endpoint", e)

    # Fallback to direct local server upload endpoint
    return {
        "upload_url": f"/api/answers/upload-{media_type}",
        "public_url": f"/api/media/{unique_key}",
        "method": "POST",
        "headers": {}
    }
