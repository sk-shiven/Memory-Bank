import sys
import io
import time
from pathlib import Path
from datetime import datetime, timezone, timedelta
import jwt
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Ensure server root is in sys.path
server_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(server_root))

load_dotenv(server_root / '.env')

from app.main import app
from app.config import settings

client = TestClient(app)


def get_auth_token(email: str = "test_user_a@example.com", name: str = "Test User A") -> tuple[str, dict]:
    """Helper to obtain a valid JWT token via demo login."""
    res = client.post("/api/auth/demo", json={"email": email, "name": name, "timezone": "UTC"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return token, headers


# ==============================================================================
# 1. AUTHENTICATION & SECURITY TESTS
# ==============================================================================

def test_missing_auth_header_strictly_unauthorized():
    """Protected endpoints MUST return 401 when no Authorization header is provided."""
    protected_paths = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/questions/today"),
        ("POST", "/api/answers"),
        ("GET", "/api/timeline"),
        ("PUT", "/api/users/preferences"),
    ]
    failures = []
    for method, path in protected_paths:
        res = client.request(method, path)
        if res.status_code != 401:
            failures.append(f"{method} {path} returned status {res.status_code} (expected 401)")
    if failures:
        raise AssertionError("Auth bypass detected! The following endpoints failed to return 401:\n" + "\n".join(failures))


def test_invalid_and_expired_jwt_tokens():
    """Invalid signatures and expired tokens must return 401."""
    # 1. Invalid signature
    bad_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"}
    res = client.get("/api/auth/me", headers=bad_headers)
    assert res.status_code == 401, f"Expected 401 for invalid JWT, got {res.status_code}"

    # 2. Expired token
    expired_payload = {
        "sub": "1",
        "email": "expired@example.com",
        "exp": datetime.now(timezone.utc) - timedelta(days=1)
    }
    expired_token = jwt.encode(expired_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    res_exp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_exp.status_code == 401, f"Expected 401 for expired JWT, got {res_exp.status_code}"


def test_demo_login_validation():
    """Tests validation constraints on demo login."""
    # Invalid email
    res = client.post("/api/auth/demo", json={"email": "not-an-email", "name": "Bad"})
    assert res.status_code == 422

    # More than 5 interests
    res_interests = client.post(
        "/api/auth/demo",
        json={
            "email": "overflow@example.com",
            "name": "Overflow",
            "interests": ["mindfulness", "growth", "relationships", "creativity", "gratitude", "career"]
        }
    )
    assert res_interests.status_code == 422


# ==============================================================================
# 2. QUESTIONS ROUTE TESTS
# ==============================================================================

def test_questions_today_and_calendar_locking():
    """Tests today's question retrieval and ensures no premature day advancement."""
    _, headers = get_auth_token("cal_user@example.com", "Calendar User")

    # Fetch today
    res = client.get("/api/questions/today", headers=headers)
    assert res.status_code == 200
    q_data = res.json()
    q_id = q_data["id"]
    day_num = q_data["day_number"]

    # Answer today's question
    ans_res = client.post(
        "/api/answers",
        headers=headers,
        json={"question_id": q_id, "text": "Reflection for today."}
    )
    assert ans_res.status_code == 200

    # Request /today again in the same local calendar day
    res_again = client.get("/api/questions/today", headers=headers)
    assert res_again.status_code == 200
    # Must remain on current day prompt with answer, NOT advance to tomorrow
    assert res_again.json()["id"] == q_id
    assert res_again.json()["day_number"] == day_num


def test_questions_day_bounds():
    """Tests day_number bounds (1 to 365)."""
    _, headers = get_auth_token("bounds_user@example.com", "Bounds User")

    # Day 0 is invalid
    res_0 = client.get("/api/questions/0", headers=headers)
    assert res_0.status_code in [400, 404, 422], f"Day 0 should be rejected, got {res_0.status_code}"

    # Day 366 is invalid
    res_366 = client.get("/api/questions/366", headers=headers)
    assert res_366.status_code in [400, 404, 422], f"Day 366 should be rejected, got {res_366.status_code}"


# ==============================================================================
# 3. ANSWERS ROUTE & CRUD TESTS
# ==============================================================================

def test_answers_crud_and_cross_user_isolation():
    """Tests complete CRUD cycle for answers and cross-tenant security."""
    _, headers_a = get_auth_token("alice@example.com", "Alice")
    _, headers_b = get_auth_token("bob@example.com", "Bob")

    # 1. Alice gets today's prompt
    alice_q = client.get("/api/questions/today", headers=headers_a).json()

    # 2. Bob attempts to answer Alice's question -> MUST return 404 / 403
    bob_steal_res = client.post(
        "/api/answers",
        headers=headers_b,
        json={"question_id": alice_q["id"], "text": "Bob trying to answer Alice's question"}
    )
    assert bob_steal_res.status_code in [403, 404], f"Cross-tenant answer submission must fail, got {bob_steal_res.status_code}"

    # 3. Alice submits answer
    alice_ans_res = client.post(
        "/api/answers",
        headers=headers_a,
        json={"question_id": alice_q["id"], "text": "Alice's original reflection"}
    )
    assert alice_ans_res.status_code == 200
    ans_id = alice_ans_res.json()["id"]

    # 4. GET /api/answers/{id}
    # Alice accesses own answer
    res_get = client.get(f"/api/answers/{ans_id}", headers=headers_a)
    assert res_get.status_code == 200
    assert res_get.json()["text"] == "Alice's original reflection"

    # Bob tries to access Alice's answer -> MUST return 404
    bob_get_res = client.get(f"/api/answers/{ans_id}", headers=headers_b)
    assert bob_get_res.status_code in [403, 404], f"Cross-tenant answer read must fail, got {bob_get_res.status_code}"

    # 5. PUT /api/answers/{id}
    # Bob tries to edit Alice's answer -> MUST return 404
    bob_put_res = client.put(
        f"/api/answers/{ans_id}",
        headers=headers_b,
        json={"text": "Bob vandalizing Alice's answer"}
    )
    assert bob_put_res.status_code in [403, 404], f"Cross-tenant answer edit must fail, got {bob_put_res.status_code}"

    # Alice updates own answer
    alice_put_res = client.put(
        f"/api/answers/{ans_id}",
        headers=headers_a,
        json={"text": "Alice's updated reflection"}
    )
    assert alice_put_res.status_code == 200
    assert alice_put_res.json()["text"] == "Alice's updated reflection"

    # 6. DELETE /api/answers/{id}
    # Bob tries to delete Alice's answer -> MUST return 404
    bob_del_res = client.delete(f"/api/answers/{ans_id}", headers=headers_b)
    assert bob_del_res.status_code in [403, 404], f"Cross-tenant answer delete must fail, got {bob_del_res.status_code}"

    # Alice deletes own answer
    alice_del_res = client.delete(f"/api/answers/{ans_id}", headers=headers_a)
    assert alice_del_res.status_code == 200

    # Verify answer is gone
    check_deleted = client.get(f"/api/answers/{ans_id}", headers=headers_a)
    assert check_deleted.status_code == 404


# ==============================================================================
# 4. MEDIA UPLOAD & PRESIGN TESTS
# ==============================================================================

def test_media_upload_validation():
    """Tests file size limits and MIME validation."""
    _, headers = get_auth_token("media_user@example.com", "Media User")

    # 1. Photo upload with invalid MIME type (.exe / text masquerading as image)
    fake_file = io.BytesIO(b"malicious script or text content")
    res_bad_mime = client.post(
        "/api/answers/upload-photo",
        headers=headers,
        files={"file": ("malicious.exe", fake_file, "application/x-msdownload")}
    )
    assert res_bad_mime.status_code in [400, 415], f"Non-image MIME must be rejected, got {res_bad_mime.status_code}"

    # 2. Oversized photo (>10 MB)
    large_photo_bytes = b"0" * (10 * 1024 * 1024 + 1024)  # 10MB + 1KB
    res_large_photo = client.post(
        "/api/answers/upload-photo",
        headers=headers,
        files={"file": ("huge.jpg", io.BytesIO(large_photo_bytes), "image/jpeg")}
    )
    assert res_large_photo.status_code == 413, f"Photo >10MB must return 413, got {res_large_photo.status_code}"

    # 3. Valid photo upload
    valid_photo_bytes = b"\xff\xd8\xff\xe0" + b"sample photo bytes"
    res_valid_photo = client.post(
        "/api/answers/upload-photo",
        headers=headers,
        files={"file": ("vacation.jpg", io.BytesIO(valid_photo_bytes), "image/jpeg")}
    )
    assert res_valid_photo.status_code == 200
    assert "url" in res_valid_photo.json()

    # 4. Oversized voice note (>25 MB)
    large_voice_bytes = b"0" * (25 * 1024 * 1024 + 1024)
    res_large_voice = client.post(
        "/api/answers/upload-voice",
        headers=headers,
        files={"file": ("huge.webm", io.BytesIO(large_voice_bytes), "audio/webm")}
    )
    assert res_large_voice.status_code == 413, f"Voice note >25MB must return 413, got {res_large_voice.status_code}"

    # 5. Pre-signed upload endpoint
    presign_res = client.post(
        "/api/media/presign-upload",
        headers=headers,
        json={"filename": "voice_note.webm", "content_type": "audio/webm", "media_type": "voice"}
    )
    assert presign_res.status_code == 200
    assert "upload_url" in presign_res.json()
    assert "public_url" in presign_res.json()


# ==============================================================================
# 5. TIMELINE PAGINATION & FILTER TESTS
# ==============================================================================

def test_timeline_pagination_and_filters():
    """Tests pagination parameters and search/format filters on /api/timeline."""
    _, headers = get_auth_token("timeline_test@example.com", "Timeline Tester")

    # Fetch with pagination parameters
    res_paged = client.get("/api/timeline?page=1&limit=5", headers=headers)
    assert res_paged.status_code == 200
    data = res_paged.json()
    assert "page" in data
    assert "limit" in data
    assert "total_pages" in data
    assert "memories" in data

    # Invalid pagination bounds
    res_inv_page = client.get("/api/timeline?page=0", headers=headers)
    assert res_inv_page.status_code in [400, 422]

    res_inv_limit = client.get("/api/timeline?limit=500", headers=headers)
    assert res_inv_limit.status_code in [400, 422]

    # Format filter
    res_photo = client.get("/api/timeline?format=photo", headers=headers)
    assert res_photo.status_code == 200


# ==============================================================================
# 6. USER SETTINGS & EXPORT TESTS
# ==============================================================================

def test_users_export():
    """Tests GET /api/users/export returning full user memory bank archive."""
    _, headers = get_auth_token("export_user@example.com", "Export User")

    res = client.get("/api/users/export", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "user" in data
    assert "stats" in data
    assert "memories" in data
    assert data["user"]["email"] == "export_user@example.com"


if __name__ == "__main__":
    print("Running exhaustive test suite...")
    test_missing_auth_header_strictly_unauthorized()
    test_invalid_and_expired_jwt_tokens()
    test_demo_login_validation()
    test_questions_today_and_calendar_locking()
    test_questions_day_bounds()
    test_answers_crud_and_cross_user_isolation()
    test_media_upload_validation()
    test_timeline_pagination_and_filters()
    test_users_export()
    print("ALL EXHAUSTIVE TESTS PASSED!")
