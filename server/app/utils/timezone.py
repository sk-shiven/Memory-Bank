from datetime import datetime, date, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Optional


def validate_timezone(tz_name: str) -> bool:
    """Validates if a timezone name is recognized by IANA timezone database."""
    try:
        ZoneInfo(tz_name)
        return True
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return False


def get_user_now(tz_name: Optional[str] = "UTC") -> datetime:
    """Returns the current timezone-aware datetime in the user's local timezone."""
    if not tz_name or not validate_timezone(tz_name):
        tz_name = "UTC"
    return datetime.now(ZoneInfo(tz_name))


def get_user_today(tz_name: Optional[str] = "UTC") -> date:
    """Returns today's date in the user's local timezone."""
    return get_user_now(tz_name).date()


def to_user_tz(dt: datetime, tz_name: Optional[str] = "UTC") -> datetime:
    """Converts a UTC or naive datetime to the user's local timezone."""
    if not tz_name or not validate_timezone(tz_name):
        tz_name = "UTC"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(ZoneInfo(tz_name))


def utc_now() -> datetime:
    """Returns current datetime in UTC with explicit timezone info."""
    return datetime.now(timezone.utc)
