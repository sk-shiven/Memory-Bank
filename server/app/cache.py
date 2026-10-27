# ==============================================================================
# 365 MEMORY BANK — DAILY QUESTION CACHING MODULE
#
# CACHE POLICY:
# We cache that day's questions only.
#
# - Questions are keyed by (interest_group, date_str):
#     e.g., "daily_q:mindfulness:2026-10-27"
# - All users belonging to the same interest group on a given calendar day
#   share the identical cached prompt, generating it once and avoiding duplicate
#   AI/LLM calls.
# - The cache TTL is strictly scoped to that day (expires at midnight of that day,
#   or at most 24 hours), ensuring no stale questions bleed across days.
# ==============================================================================

import time
import threading
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# In-memory thread-safe cache store
_memory_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()


def _get_seconds_until_midnight() -> int:
    """Calculates seconds remaining until midnight UTC (default fallback TTL)."""
    now = time.time()
    seconds_in_day = 86400
    seconds_elapsed_today = now % seconds_in_day
    seconds_left = int(seconds_in_day - seconds_elapsed_today)
    return max(60, min(seconds_left, seconds_in_day))


def get_daily_question(interest_group: str, date_str: str) -> Optional[dict]:
    """Retrieves that day's question for a specific interest group from cache.

    NOTE: We cache that day's questions only. Returns None on cache miss or expiration.
    """
    key = f"daily_q:{interest_group.strip().lower()}:{date_str.strip()}"
    now = time.time()

    with _cache_lock:
        entry = _memory_cache.get(key)
        if entry:
            if entry["expires_at"] > now:
                logger.info("Cache HIT for daily question [%s]", key)
                return entry["data"]
            else:
                # Expired: purge entry
                del _memory_cache[key]
                logger.info("Cache EXPIRED for daily question [%s]", key)

    return None


def set_daily_question(
    interest_group: str,
    date_str: str,
    question_data: dict,
    ttl_seconds: Optional[int] = None
) -> None:
    """Stores that day's question for an interest group into the cache.

    NOTE: We cache that day's questions only. The TTL strictly expires at end of day.
    """
    key = f"daily_q:{interest_group.strip().lower()}:{date_str.strip()}"
    ttl = ttl_seconds if ttl_seconds is not None else _get_seconds_until_midnight()
    expires_at = time.time() + ttl

    with _cache_lock:
        _memory_cache[key] = {
            "data": question_data,
            "expires_at": expires_at
        }
        logger.info("Cached that day's question [%s] (TTL: %d seconds)", key, ttl)


def clear_cache() -> None:
    """Purges all entries from the memory cache (useful in test suites)."""
    with _cache_lock:
        _memory_cache.clear()
