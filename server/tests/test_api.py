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


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "365" in data["app"]


def test_today_question():
    response = client.get("/api/questions/today")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "day_number" in data
    assert "question_text" in data
    assert len(data["question_text"]) > 0


def test_timeline():
    response = client.get("/api/timeline")
    assert response.status_code == 200
    data = response.json()
    assert "total_memories" in data
    assert "memories" in data
    assert isinstance(data["memories"], list)


if __name__ == "__main__":
    print("Running API tests...")
    test_health_check()
    print("  ✅ GET / (health_check) passed")
    test_today_question()
    print("  ✅ GET /api/questions/today passed")
    test_timeline()
    print("  ✅ GET /api/timeline passed")
    print("ALL API TESTS PASSED!")
