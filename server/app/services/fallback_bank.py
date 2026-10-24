"""Static fallback question bank for the 365 daily journaling loop.

Used whenever AI generation fails, is rate-limited, or before scheduled batches run.
"""

FALLBACK_QUESTIONS = [
    {"day": 1, "text": "What is one small thing that brought you genuine joy or calm today?", "tags": "joy,mindfulness"},
    {"day": 2, "text": "Who is someone you are deeply grateful for right now, and why?", "tags": "gratitude,relationships"},
    {"day": 3, "text": "What is a decision you made recently that you felt proud of?", "tags": "growth,decisions"},
    {"day": 4, "text": "What was the most challenging part of your day, and how did you handle it?", "tags": "resilience,challenges"},
    {"day": 5, "text": "If you could capture one sound from today to remember forever, what would it be?", "tags": "senses,memory"},
    {"day": 6, "text": "What is an idea or topic that recently sparked your curiosity?", "tags": "curiosity,learning"},
    {"day": 7, "text": "Looking back over the past week, what is one lesson you want to carry forward?", "tags": "reflection,weekly"},
    {"day": 8, "text": "What made you laugh or smile the hardest today?", "tags": "humor,joy"},
    {"day": 9, "text": "What is a habit or routine that is currently serving you well?", "tags": "habits,routine"},
    {"day": 10, "text": "How did you take care of your body or mind today?", "tags": "health,wellness"},
    {"day": 11, "text": "What is something beautiful you saw today that caught your eye?", "tags": "beauty,perspective"},
    {"day": 12, "text": "What is a conversation you had today that lingered with you?", "tags": "conversations,connections"},
    {"day": 13, "text": "What is a boundary you set or maintained recently?", "tags": "boundaries,self-respect"},
    {"day": 14, "text": "What is a place you visited this week that gave you a sense of peace?", "tags": "peace,spaces"},
    {"day": 15, "text": "What skill or craft are you currently working on improving?", "tags": "craft,skills"},
    {"day": 16, "text": "What is an assumption you held that was challenged recently?", "tags": "open-mindedness,thinking"},
    {"day": 17, "text": "What was the most delicious thing you ate or drank today?", "tags": "sensory,gratitude"},
    {"day": 18, "text": "What is something you wish you had said to someone today, or were glad you said?", "tags": "expression,honesty"},
    {"day": 19, "text": "What is a song, podcast, or piece of media that resonated with your mood today?", "tags": "art,culture"},
    {"day": 20, "text": "When did you feel most present and in the moment today?", "tags": "presence,flow"},
    {"day": 21, "text": "What is a dream or project you're quietly excited to build next?", "tags": "future,creativity"},
    {"day": 22, "text": "How did you show kindness to someone else today, or how did someone show it to you?", "tags": "kindness,community"},
    {"day": 23, "text": "What is one fear or worry that you managed to let go of today?", "tags": "courage,peace"},
    {"day": 24, "text": "If today had a color, what color would it be and why?", "tags": "creative,metaphor"},
    {"day": 25, "text": "What is something in your physical environment that feels like home to you?", "tags": "home,comfort"},
    {"day": 26, "text": "What was the hardest choice you had to make today?", "tags": "choices,priorities"},
    {"day": 27, "text": "Who is a person you haven't spoken to in a while that you miss?", "tags": "nostalgia,relationships"},
    {"day": 28, "text": "What is one thing you learned today that surprised you?", "tags": "surprise,knowledge"},
    {"day": 29, "text": "How did you deal with unexpected friction or delays today?", "tags": "patience,adaptation"},
    {"day": 30, "text": "If you could summarize this month in three words, what would they be?", "tags": "milestone,reflection"},
    {"day": 31, "text": "What is a small promise you made to yourself that you kept?", "tags": "integrity,trust"},
    {"day": 32, "text": "What is an old memory that popped into your head today?", "tags": "memory,nostalgia"},
    {"day": 33, "text": "What is something you did today purely for your own enjoyment?", "tags": "play,leisure"},
    {"day": 34, "text": "What is something you are looking forward to tomorrow?", "tags": "hope,anticipation"},
    {"day": 35, "text": "What advice would your future self give you right now?", "tags": "wisdom,perspective"},
    {"day": 36, "text": "What is something you changed your mind about recently?", "tags": "evolution,mindset"},
    {"day": 37, "text": "What made you feel proud of who you are becoming today?", "tags": "identity,growth"},
    {"day": 38, "text": "What is a compliment someone gave you that stuck with you?", "tags": "affirmation,connection"},
    {"day": 39, "text": "What is a texture, temperature, or physical sensation you noticed today?", "tags": "sensory,body"},
    {"day": 40, "text": "What is a quote, thought, or lyric that feels true to you today?", "tags": "inspiration,words"},
    {"day": 41, "text": "What is something you feel like you are waiting for in life right now?", "tags": "patience,longing"},
    {"day": 42, "text": "What is one way you expressed your authentic self today?", "tags": "authenticity,self"},
    {"day": 43, "text": "What is a task you procrastinated on, and what is really holding you back?", "tags": "clarity,focus"},
    {"day": 44, "text": "Who in your life makes you feel safe to be completely yourself?", "tags": "safety,love"},
    {"day": 45, "text": "What is something simple that made your morning feel special?", "tags": "rituals,morning"},
    {"day": 46, "text": "How did you handle silence or solitude today?", "tags": "solitude,peace"},
    {"day": 47, "text": "What is a risk, however small, that you took recently?", "tags": "risk,growth"},
    {"day": 48, "text": "What is a scent from today that brought back a memory?", "tags": "senses,memory"},
    {"day": 49, "text": "If you could tell someone 'thank you' right now, who would it be?", "tags": "gratitude,appreciation"},
    {"day": 50, "text": "Looking at where you are today compared to Day 1, what has subtly shifted?", "tags": "transformation,milestone"},
]


def get_fallback_question(day_number: int) -> dict:
    """Returns a fallback question for the given day number (1-365)."""
    index = (day_number - 1) % len(FALLBACK_QUESTIONS)
    item = FALLBACK_QUESTIONS[index]
    return {
        "day": day_number,
        "text": item["text"],
        "tags": item["tags"]
    }
