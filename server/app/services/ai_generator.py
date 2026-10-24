import logging
from typing import List, Optional
import anthropic
from app.config import settings
from app.services.fallback_bank import get_fallback_question

logger = logging.getLogger(__name__)


def generate_daily_question(
    day_number: int,
    past_questions: Optional[List[str]] = None,
    recent_themes: Optional[List[str]] = None
) -> dict:
    """Generates the next daily question using Claude Haiku 4.5.

    Gracefully falls back to the static fallback question bank if the Anthropic API
    key is missing, throttled, or fails.
    """
    fallback = get_fallback_question(day_number)

    if not settings.ANTHROPIC_API_KEY:
        logger.info("No ANTHROPIC_API_KEY configured; using fallback question for Day %d", day_number)
        return fallback

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        past_context = ""
        if past_questions:
            past_context = "Previously asked questions (DO NOT REPEAT OR CLOSELY REPHRASE THESE):\n" + "\n".join(
                f"- {q}" for q in past_questions[-15:]
            )

        themes_context = ""
        if recent_themes:
            themes_context = f"Recent themes the user engaged with: {', '.join(recent_themes[-5:])}."

        prompt = f"""You are the thoughtful question curator for '365', a daily reflection and memory journal app.
Every day for 365 days, the app asks the user one evocative, specific, and reflective question.

Current Milestone: Day {day_number} of 365.
{themes_context}
{past_context}

Rules:
1. Ask exactly ONE specific question.
2. The question must be warm, intimate, introspective, and inviting to answer with text, a photo, or a voice note.
3. Keep it concise (1 to 2 sentences max).
4. Do not include greetings, introductions, or quotes. Output ONLY the question text followed by | followed by 2-3 comma-separated theme tags.

Example format:
What is a small detail about your morning today that felt unexpectedly comforting?|mindfulness,morning,comfort"""

        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=150,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        content = response.content[0].text.strip()
        if "|" in content:
            question_text, tags = content.split("|", 1)
            return {
                "day": day_number,
                "text": question_text.strip(),
                "tags": tags.strip()
            }
        else:
            return {
                "day": day_number,
                "text": content,
                "tags": "reflection,daily"
            }

    except Exception as e:
        logger.warning("Claude question generation failed for Day %d: %s. Using fallback.", day_number, e)
        return fallback
