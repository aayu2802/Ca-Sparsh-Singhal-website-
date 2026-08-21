from datetime import datetime
from sqlalchemy.dialects.mysql import INTEGER
from shared import db


# ==========================================================
# TEST SERIES
# ==========================================================

class TestSeries(db.Model):
    __tablename__ = "test_series"
    __table_args__ = {"extend_existing": True}

    id = db.Column(INTEGER(unsigned=True), primary_key=True)

    subject_id = db.Column(
        INTEGER(unsigned=True),
        nullable=False
    )

    series_name = db.Column(
        db.String(255),
        nullable=False
    )

    product_kind = db.Column(
        db.String(100),
        nullable=False
    )

    price = db.Column(
        db.Numeric(10, 2),
        nullable=True
    )

    valid_until = db.Column(
        db.Date,
        nullable=False
    )

    seats_remaining = db.Column(
        db.Integer,
        nullable=True
    )

    icon = db.Column(
        db.String(50),
        default="Layers"
    )

    short_description = db.Column(
        db.String(255),
        nullable=False
    )

    full_description = db.Column(
        db.Text,
        nullable=False
    )

    status = db.Column(
        db.Boolean,
        default=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    tests = db.relationship(
        "Test",
        backref="series",
        cascade="all, delete-orphan",
        lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "series_name": self.series_name,
            "product_kind": self.product_kind,
            "price": float(self.price) if self.price else 0,
            "valid_until": self.valid_until.isoformat(),
            "seats_remaining": self.seats_remaining,
            "icon": self.icon,
            "short_description": self.short_description,
            "full_description": self.full_description,
            "status": self.status,
            "total_tests": len(self.tests)
        }


# ==========================================================
# TEST
# ==========================================================

class Test(db.Model):
    __tablename__ = "tests"
    __table_args__ = {"extend_existing": True}

    id = db.Column(INTEGER(unsigned=True), primary_key=True)

    series_id = db.Column(
        INTEGER(unsigned=True),
        db.ForeignKey("test_series.id"),
        nullable=False
    )

    title = db.Column(db.String(150), nullable=False)

    duration_minutes = db.Column(
        db.Integer,
        default=60
    )

    question_paper_pdf = db.Column(
        db.String(255)
    )

    answer_key_pdf = db.Column(
        db.String(255)
    )

    questions = db.relationship(
        "Question",
        backref="test",
        cascade="all, delete-orphan",
        lazy=True
    )

    attempts = db.relationship(
        "TestAttempt",
        backref="test",
        cascade="all, delete-orphan",
        lazy=True
    )

    def to_dict(self, include_questions=False):

        data = {
            "id": self.id,
            "series_id": self.series_id,
            "title": self.title,
            "duration_minutes": self.duration_minutes,

            # PDF Details
            "question_paper_pdf": self.question_paper_pdf,
            "answer_key_pdf": self.answer_key_pdf,

            "has_question_paper": True if self.question_paper_pdf else False,
            "has_answer_key": True if self.answer_key_pdf else False,

            "total_questions": len(self.questions)
        }

        if include_questions:
            data["questions"] = [
                q.to_dict(include_answer=True)
                for q in self.questions
            ]

        return data

# ==========================================================
# QUESTION
# ==========================================================

class Question(db.Model):
    __tablename__ = "questions"
    __table_args__ = {"extend_existing": True}

    id = db.Column(INTEGER(unsigned=True), primary_key=True)

    test_id = db.Column(
        INTEGER(unsigned=True),
        db.ForeignKey("tests.id"),
        nullable=False
    )

    question_text = db.Column(
        db.Text,
        nullable=False
    )

    option_a = db.Column(
        db.String(255),
        nullable=False
    )

    option_b = db.Column(
        db.String(255),
        nullable=False
    )

    option_c = db.Column(
        db.String(255),
        nullable=False
    )

    option_d = db.Column(
        db.String(255),
        nullable=False
    )

    correct_option = db.Column(
        db.String(5),
        nullable=False
    )

    def to_dict(self, include_answer=False):

        data = {
            "id": self.id,
            "test_id": self.test_id,
            "question_text": self.question_text,
            "options": {
                "A": self.option_a,
                "B": self.option_b,
                "C": self.option_c,
                "D": self.option_d,
            },
        }

        if include_answer:
            data["correct_option"] = self.correct_option

        return data


# ==========================================================
# TEST ATTEMPT
# ==========================================================

class TestAttempt(db.Model):
    __tablename__ = "test_attempts"
    __table_args__ = {"extend_existing": True}

    id = db.Column(
        INTEGER(unsigned=True),
        primary_key=True
    )

    user_id = db.Column(
        INTEGER(unsigned=True),
        db.ForeignKey("users.id"),
        nullable=False
    )

    test_id = db.Column(
        INTEGER(unsigned=True),
        db.ForeignKey("tests.id"),
        nullable=False
    )

    score = db.Column(
        db.Integer,
        default=0
    )

    total_marks = db.Column(
        db.Integer,
        default=0
    )

    submitted_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "test_id": self.test_id,
            "score": self.score,
            "total_marks": self.total_marks,
            "submitted_at": self.submitted_at.isoformat(),
        }