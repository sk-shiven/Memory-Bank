import sys
from pathlib import Path
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Ensure server/ root is in sys.path
server_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(server_root))

env_path = server_root / '.env'
load_dotenv(env_path)

from app.main import app

client = TestClient(app)


def get_token():
    res = client.post("/api/auth/demo", json={"email": "demo@example.com", "name": "Demo User"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "365" in data["app"]


def test_auth_me():
    headers = get_token()
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "email" in data
    assert "timezone" in data
    assert "preferred_journaling_time" in data
    assert "interests" in data
    assert isinstance(data["interests"], list)


def test_today_question():
    headers = get_token()
    response = client.get("/api/questions/today", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "day_number" in data
    assert "question_text" in data
    assert len(data["question_text"]) > 0


def test_update_user_preferences():
    headers = get_token()
    response = client.put(
        "/api/users/preferences",
        headers=headers,
        json={
            "preferred_journaling_time": "21:30:00",
            "timezone": "America/New_York",
            "interests": ["mindfulness", "creativity", "philosophy"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["preferred_journaling_time"] == "21:30:00"
    assert data["timezone"] == "America/New_York"
    assert "philosophy" in data["interests"]


def test_invalid_interests_rejected():
    headers = get_token()
    # Test > 5 interests rejected
    response = client.put(
        "/api/users/preferences",
        headers=headers,
        json={
            "interests": ["mindfulness", "growth", "relationships", "creativity", "gratitude", "career"]
        }
    )
    assert response.status_code == 422

    # Test invalid category rejected
    bad_res = client.put(
        "/api/users/preferences",
        headers=headers,
        json={
            "interests": ["quantum_physics_astrology"]
        }
    )
    assert bad_res.status_code == 422


def test_submit_answer():
    headers = get_token()
    q_res = client.get("/api/questions/today", headers=headers)
    q_id = q_res.json()["id"]

    ans_res = client.post(
        "/api/answers",
        headers=headers,
        json={
            "question_id": q_id,
            "text": "Tested reflection via FastAPI TestClient.",
            "photo_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800"
        }
    )
    assert ans_res.status_code == 200
    ans_data = ans_res.json()
    assert ans_data["question_id"] == q_id
    assert "Tested reflection" in ans_data["text"]


def test_timeline():
    headers = get_token()
    response = client.get("/api/timeline", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_memories" in data
    assert "memories" in data
    assert isinstance(data["memories"], list)


if __name__ == "__main__":
    print("Running API tests...")
    test_health_check()
    print("  ✅ GET / (health_check) passed")
    test_auth_me()
    print("  ✅ GET /api/auth/me passed")
    test_today_question()
    print("  ✅ GET /api/questions/today passed")
    test_update_user_preferences()
    print("  ✅ PUT /api/users/preferences passed")
    test_invalid_interests_rejected()
    print("  ✅ PUT /api/users/preferences validation passed")
    test_submit_answer()
    print("  ✅ POST /api/answers passed")
    test_timeline()
    print("  ✅ GET /api/timeline passed")
    print("🎉 ALL API ENDPOINT TESTS PASSED!")
