"""
app/services/demo_seed.py: opt-in demo data seeding.

Runs at startup only when settings.SEED_DEMO is true (the hosted demo).
Seeds a public demo classroom: one demo teacher, six demo students, two
teaching materials, one fractions quiz, and quiz progress so the teacher
dashboard heatmap and check-in list show real data.

Everything is created through the app's own storage functions (the same
db helpers the auth, materials, quiz-builder and quiz-submit routes use),
and every item is checked by username or title first, so running this on
every boot never creates duplicates.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from loguru import logger

from app.core.config import settings
from app.services import db, faiss_store
from app.tools.agent_tools import update_progress

DEMO_TEACHER_USERNAME = "teacher"
DEMO_TEACHER_PASSWORD = "LearnLocalDemo1"
DEMO_TEACHER_NAME = "Demo Teacher"

# (display name, username, PIN, grade level)
DEMO_STUDENTS: list[tuple[str, str, str, str]] = [
    ("Asha", "asha", "1111", "7th"),
    ("Ravi", "ravi", "2222", "7th"),
    ("Meena", "meena", "3333", "6th"),
    ("Arjun", "arjun", "4444", "8th"),
    ("Priya", "priya", "5555", "6th"),
    ("Kiran", "kiran", "6666", "8th"),
]

# Students who should look recently active. Kiran is left without a
# last_active stamp on purpose, so the dashboard check-in list also shows
# an "inactive" example.
_RECENTLY_ACTIVE = {"asha", "ravi", "meena", "arjun", "priya"}

FRACTIONS_MATERIAL_TITLE = "Fractions Made Easy"
FRACTIONS_MATERIAL_SUBJECT = "Mathematics"
FRACTIONS_MATERIAL_TEXT = """Fractions Made Easy

A fraction tells us how many equal parts of a whole we have. The number
on top is the numerator. It counts the parts we are talking about. The
number at the bottom is the denominator. It tells us how many equal
parts the whole was split into. In the fraction 3/4, the whole is split
into 4 equal parts and we have 3 of them.

Fractions with the same denominator are easy to add. Keep the
denominator and add the numerators. 1/4 + 2/4 = 3/4. When the
denominators are different, first make them the same. 1/2 + 1/4 becomes
2/4 + 1/4, which is 3/4.

To compare fractions, look at the size of each part. A bigger
denominator means smaller parts, so 1/2 is larger than 1/3, and 1/3 is
larger than 1/4.

A fraction of a number means a part of that number. To find 3/4 of 20,
first divide 20 by 4 to get 5, then multiply by 3 to get 15.

Always write a fraction in its simplest form. 6/8 can be simplified by
dividing the top and the bottom by 2, giving 3/4.
"""

WATER_CYCLE_MATERIAL_TITLE = "The Water Cycle"
WATER_CYCLE_MATERIAL_SUBJECT = "Science"
WATER_CYCLE_MATERIAL_TEXT = """The Water Cycle

Water on Earth is always moving. The journey water takes is called the
water cycle, and it has four main stages.

Evaporation: The sun heats water in rivers, lakes and oceans. Some of
the water turns into an invisible gas called water vapour and rises
into the air.

Condensation: High in the sky the air is cold. The water vapour cools
down and changes back into tiny drops of water. Billions of these drops
gather together and form clouds.

Precipitation: When the drops in a cloud become too heavy, they fall
back to Earth as rain. In very cold places they may fall as snow or
hail instead.

Collection: The fallen water collects in rivers, lakes, oceans and
under the ground. From there the sun can warm it again, and the whole
cycle begins once more.

The water cycle never stops, and the water we drink today is the same
water that has been cycling around our planet for millions of years.
"""

FRACTIONS_QUIZ_TITLE = "Fractions Practice Quiz"
FRACTIONS_QUIZ_SUBJECT = "Mathematics"
FRACTIONS_QUESTIONS: list[dict] = [
    {
        "question": "What is 1/2 + 1/4?",
        "options": ["3/4", "1/2", "2/6", "1/8"],
        "correct_answer": "3/4",
        "explanation": "Make the denominators the same first: 1/2 is 2/4, and 2/4 + 1/4 = 3/4.",
    },
    {
        "question": "Which fraction is the largest?",
        "options": ["1/3", "1/2", "1/4", "1/5"],
        "correct_answer": "1/2",
        "explanation": "A smaller denominator means bigger parts, so 1/2 is the largest here.",
    },
    {
        "question": "What is 3/4 of 20?",
        "options": ["10", "12", "15", "16"],
        "correct_answer": "15",
        "explanation": "Divide 20 by 4 to get 5, then multiply by 3 to get 15.",
    },
    {
        "question": "Simplify 6/8.",
        "options": ["3/4", "2/3", "1/2", "5/6"],
        "correct_answer": "3/4",
        "explanation": "Divide the top and the bottom by 2: 6/8 becomes 3/4.",
    },
    {
        "question": "What is 5/6 - 1/6?",
        "options": ["2/3", "1/3", "1/6", "5/6"],
        "correct_answer": "2/3",
        "explanation": "5/6 - 1/6 = 4/6, and 4/6 simplifies to 2/3.",
    },
    {
        "question": "Which fraction is equal to 0.5?",
        "options": ["1/4", "2/4", "1/3", "3/4"],
        "correct_answer": "2/4",
        "explanation": "2/4 simplifies to 1/2, and 1/2 as a decimal is 0.5.",
    },
]

WATER_CYCLE_TOPIC = "The Water Cycle"
WATER_CYCLE_QUESTIONS: list[dict] = [
    {
        "question": "What is it called when water turns into vapour and rises?",
        "options": ["Evaporation", "Condensation", "Precipitation", "Collection"],
        "correct_answer": "Evaporation",
    },
    {
        "question": "What forms when water vapour cools high in the sky?",
        "options": ["Rain", "Clouds", "Rivers", "Ice"],
        "correct_answer": "Clouds",
    },
    {
        "question": "Rain, snow and hail are all examples of what?",
        "options": ["Evaporation", "Precipitation", "Condensation", "Collection"],
        "correct_answer": "Precipitation",
    },
    {
        "question": "Where does water collect after it falls?",
        "options": ["Only in the sky", "In rivers, lakes and oceans", "Inside clouds", "On mountain tops only"],
        "correct_answer": "In rivers, lakes and oceans",
    },
]

# Which question indexes each student answers as the quiz expects.
# Everyone else gets a plausible different option, mirroring a real attempt.
_FRACTIONS_PLAN: dict[str, set[int]] = {
    "asha": {0, 1, 2, 3, 4, 5},   # 6 of 6, strong
    "ravi": {0, 1, 2, 3, 5},      # 5 of 6, strong
    "arjun": {0, 2, 3, 4},        # 4 of 6, steady
    "kiran": {0, 1, 3, 5},        # 4 of 6, steady
    "meena": {0, 3},              # 2 of 6, could use a check-in
    "priya": {0},                 # 1 of 6, could use a check-in
}
_WATER_CYCLE_PLAN: dict[str, set[int]] = {
    "asha": {0, 1, 2},            # 3 of 4
    "ravi": {0, 1, 2, 3},         # 4 of 4
    "meena": {0, 2},              # 2 of 4
    "priya": {1},                 # 1 of 4
}


def _pick_answer(question: dict, wants_correct: bool) -> str:
    """Return the expected answer, or the first different option."""
    correct = question["correct_answer"]
    if wants_correct:
        return correct
    for option in question["options"]:
        if option != correct:
            return option
    return correct


async def _seed_attempt(
    student_id: str,
    topic: str,
    questions: list[dict],
    correct_indexes: set[int],
) -> bool:
    """
    Record one quiz attempt exactly the way POST /api/quiz/submit does:
    update mastery from the overall score, store one row per question
    (question_text is the question text), then a summary row.
    Returns False when this attempt was already seeded.
    """
    summary_marker = f"quiz:{topic}:summary"
    seen = await db.get_seen_question_ids(student_id, topic, [summary_marker])
    if summary_marker in seen:
        return False

    answers = [
        (q["question"], _pick_answer(q, i in correct_indexes), q["correct_answer"])
        for i, q in enumerate(questions)
    ]
    correct_count = sum(
        1 for _, given, expected in answers
        if given.strip().lower() == expected.strip().lower()
    )
    overall = correct_count / len(answers) if answers else 0.0

    await update_progress(
        student_id=student_id,
        topic=topic,
        score=overall,
        question_ids=[q["question"] for q in questions],
    )
    for question_text, given, expected in answers:
        is_correct = given.strip().lower() == expected.strip().lower()
        await db.record_quiz_result(
            student_id=student_id,
            session_id=None,
            topic=topic,
            question_text=question_text,
            student_answer=given,
            correct=is_correct,
            score=1.0 if is_correct else 0.0,
        )
    await db.record_quiz_result(
        student_id=student_id,
        session_id=None,
        topic=topic,
        question_text=summary_marker,
        student_answer=str(correct_count),
        correct=correct_count == len(answers),
        score=overall,
    )
    return True


async def _seed_material(
    title: str,
    subject: str,
    text: str,
    filename: str,
    teacher_id: str,
    existing_titles: set[str],
) -> bool:
    """Write a small text file and register it like the upload route does."""
    if title in existing_titles:
        return False

    # Same chunking and indexing helpers the material upload route uses.
    from app.api.routes.materials import _chunk_text

    materials_dir = Path(settings.MATERIALS_DIR)
    materials_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())[:8]
    dest_path = materials_dir / f"{file_id}_{filename}"
    dest_path.write_text(text, encoding="utf-8")

    passage_count = 0
    try:
        chunks = _chunk_text(text, f"{title}.txt")
        if chunks:
            passage_count = faiss_store.add_passages(chunks)
    except Exception as exc:
        logger.warning("Demo seed: indexing skipped for '{}': {}", title, exc)

    await db.create_material(
        title=title,
        subject=subject,
        file_path=str(dest_path),
        uploaded_by=teacher_id,
        faiss_indexed=passage_count > 0,
    )
    return True


async def seed_demo_data() -> None:
    """Seed the demo classroom. Idempotent: safe to call on every boot."""
    created: list[str] = []

    teacher = await db.get_teacher_by_username(DEMO_TEACHER_USERNAME)
    if teacher is None:
        teacher = await db.create_teacher(
            username=DEMO_TEACHER_USERNAME,
            password_hash=db._hash_secret(DEMO_TEACHER_PASSWORD),
            display_name=DEMO_TEACHER_NAME,
            is_admin=True,
            initial_password=DEMO_TEACHER_PASSWORD,
            created_by=None,
        )
        created.append("teacher")
    teacher_id = teacher["id"]

    students: dict[str, dict] = {}
    for name, username, pin, grade in DEMO_STUDENTS:
        student = await db.get_student_by_username(username)
        if student is None:
            student = await db.create_registered_student(
                name=name,
                username=username,
                pin_hash=db._hash_secret(pin),
                pin_visible=pin,
                language="en",
                grade_level=grade,
            )
            created.append(f"student:{username}")
        if username in _RECENTLY_ACTIVE:
            await db.update_last_active(student["id"])
        students[username] = student

    existing_titles = {m["title"] for m in await db.get_all_materials()}
    if await _seed_material(
        FRACTIONS_MATERIAL_TITLE,
        FRACTIONS_MATERIAL_SUBJECT,
        FRACTIONS_MATERIAL_TEXT,
        "fractions-made-easy.txt",
        teacher_id,
        existing_titles,
    ):
        created.append("material:fractions")
    if await _seed_material(
        WATER_CYCLE_MATERIAL_TITLE,
        WATER_CYCLE_MATERIAL_SUBJECT,
        WATER_CYCLE_MATERIAL_TEXT,
        "the-water-cycle.txt",
        teacher_id,
        existing_titles,
    ):
        created.append("material:water-cycle")

    existing_quiz_titles = {q["title"] for q in await db.get_all_teacher_quizzes()}
    if FRACTIONS_QUIZ_TITLE not in existing_quiz_titles:
        await db.create_teacher_quiz(
            title=FRACTIONS_QUIZ_TITLE,
            subject=FRACTIONS_QUIZ_SUBJECT,
            questions=FRACTIONS_QUESTIONS,
            assigned_to="all",
            created_by=teacher_id,
        )
        created.append("quiz:fractions")

    # Progress. CoursePage submits teacher-quiz attempts with the quiz
    # subject as the topic, so Fractions attempts land under "Mathematics".
    attempts = 0
    for username, correct_indexes in _FRACTIONS_PLAN.items():
        if await _seed_attempt(
            students[username]["id"],
            FRACTIONS_QUIZ_SUBJECT,
            FRACTIONS_QUESTIONS,
            correct_indexes,
        ):
            attempts += 1
    for username, correct_indexes in _WATER_CYCLE_PLAN.items():
        if await _seed_attempt(
            students[username]["id"],
            WATER_CYCLE_TOPIC,
            WATER_CYCLE_QUESTIONS,
            correct_indexes,
        ):
            attempts += 1
    if attempts:
        created.append(f"attempts:{attempts}")

    if created:
        logger.info("Demo seed complete: created {}", ", ".join(created))
    else:
        logger.info("Demo seed: all demo data already present, nothing to add.")
