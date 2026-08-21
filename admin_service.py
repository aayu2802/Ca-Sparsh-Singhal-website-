from shared import db
from shared.models.course import Course
from shared.models.doubt import Doubt
from shared.models.test import TestSeries, Test, Question
from shared.models.user import User

class AdminService:

    # ==================================================
    # COURSE OPERATIONS
    # ==================================================

    @staticmethod
    def create_course(title, description):
        course = Course(
            title=title,
            description=description
        )

        db.session.add(course)
        db.session.commit()

        return course

    @staticmethod
    def delete_course(course_id):
        course = Course.query.get(course_id)

        if not course:
            return False

        db.session.delete(course)
        db.session.commit()

        return True

    # ==================================================
    # DOUBT OPERATIONS
    # ==================================================

    @staticmethod
    def get_all_doubts():
        return Doubt.query.order_by(
            Doubt.created_at.desc()
        ).all()

    @staticmethod
    def reply_to_doubt(doubt_id, reply_text):
        doubt = Doubt.query.get(doubt_id)

        if not doubt:
            return None

        doubt.reply = reply_text
        doubt.status = "answered"

        db.session.commit()

        return doubt

    # ==================================================
    # TEST SERIES OPERATIONS
    # ==================================================

    @staticmethod
    def create_test_series(data):
        try:

            subject_id = data.get("subject_id")
            series_name = data.get("series_name", "").strip()
            product_kind = data.get("product_kind")
            price = data.get("price", 0)
            valid_until = data.get("valid_until")
            seats_remaining = data.get("seats_remaining", 0)
            icon = data.get("icon", "Layers")
            short_description = data.get("short_description", "")
            full_description = data.get("full_description", "")
            status = data.get("status", True)

            if not subject_id:
                return None, "subject_id is required"

            if not series_name:
                return None, "series_name is required"

            if not product_kind:
                return None, "product_kind is required"

            if not valid_until:
                return None, "valid_until is required"

            series = TestSeries(
                subject_id=int(subject_id),
                series_name=series_name,
                product_kind=product_kind,
                price=price,
                valid_until=valid_until,
                seats_remaining=int(seats_remaining),
                icon=icon,
                short_description=short_description,
                full_description=full_description,
                status=bool(status)
            )

            db.session.add(series)
            db.session.commit()

            return series, None

        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def create_test(data):
        try:

            title = data.get("title", "").strip()
            series_id = data.get("series_id")
            duration_minutes = data.get("duration_minutes", 60)

            if not title:
                return None, "title is required"

            if not series_id:
                return None, "series_id is required"

            series = TestSeries.query.get(int(series_id))

            if not series:
                return None, "Test Series not found"

            test = Test(
                title=title,
                series_id=int(series_id),
                duration_minutes=int(duration_minutes)
            )

            db.session.add(test)
            db.session.commit()

            return test, None

        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def get_test_answer_key(test_id):

        test = Test.query.get(test_id)

        if not test:
            return None, "Test paper not found"

        questions = Question.query.filter_by(
            test_id=test_id
        ).all()

        answer_key = []

        for q in questions:
            answer_key.append({
                "question_id": q.id,
                "question_text": q.question_text,
                "options": {
                    "A": q.option_a,
                    "B": q.option_b,
                    "C": q.option_c,
                    "D": q.option_d
                },
                "correct_option": q.correct_option
            })

        return {
            "test_id": test.id,
            "test_title": test.title,
            "answer_key_pdf": test.answer_key_pdf,
            "answer_key": answer_key
        }, None
    # ==================================================
    # student Stats
    # ==================================================

    @staticmethod
    def get_all_students():

        return User.query.order_by(User.created_at.desc()).all()


    @staticmethod
    def get_student(student_id):

        return User.query.get(student_id)
    # ==================================================
    # DASHBOARD STATS
    # ==================================================

    @staticmethod
    def get_dashboard_stats():

        try:

            total_courses = Course.query.count()
            total_tests = Test.query.count()

            pending_doubts = Doubt.query.filter(
                Doubt.status.in_(["pending", "Pending"])
            ).count()

            return {
                "totalStudents": 0,
                "newStudents30d": 0,
                "revenueTotal": 0,
                "revenue30d": 0,
                "submissionsPending": pending_doubts,
                "submissionsEvaluated": 0,
                "sales": [],
                "coursesTotal": total_courses,
                "totalTests": total_tests
            }

        except Exception as e:

            return {
                "totalStudents": 0,
                "newStudents30d": 0,
                "revenueTotal": 0,
                "revenue30d": 0,
                "submissionsPending": 0,
                "submissionsEvaluated": 0,
                "sales": [],
                "coursesTotal": 0,
                "totalTests": 0,
                "error": str(e)
            }
            
    
   