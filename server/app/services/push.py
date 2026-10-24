import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True

    if settings.FIREBASE_CREDENTIALS_PATH:
        try:
            import firebase_admin
            from firebase_admin import credentials
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            return True
        except Exception as e:
            logger.warning("Firebase init failed: %s", e)
    return False


def send_push_notification(token: str, title: str, body: str, data: Optional[dict] = None) -> bool:
    """Sends a push notification via Firebase Cloud Messaging."""
    if not init_firebase():
        logger.info("[Mock Push] To: %s | %s: %s", token[:15] + "...", title, body)
        return True

    try:
        from firebase_admin import messaging
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=token,
        )
        response = messaging.send(message)
        logger.info("Successfully sent message: %s", response)
        return True
    except Exception as e:
        logger.error("Failed to send push notification: %s", e)
        return False
