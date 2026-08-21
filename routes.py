from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from app_main.controllers.main_controller import MainController
from app_main.controllers.main_test_controller import MainTestController

main_bp = Blueprint('main', __name__)

# ==========================================
# 📚 1. COURSE ROUTES
# ==========================================

@main_bp.route('/courses', methods=['GET'])
def get_all_courses():
    return MainController.fetch_courses()


@main_bp.route('/courses/<int:course_id>', methods=['GET'])
def get_course_details(course_id):
    # Controller handles response formatting and error checking directly
    return MainController.fetch_course_by_id(course_id)


# ==========================================
# ❓ 2. DOUBT ROUTES
# ==========================================

@main_bp.route('/doubts', methods=['POST'])
@jwt_required()
def create_doubt():
    user_id = get_jwt_identity()
    return MainController.add_doubt(user_id)


@main_bp.route('/my-doubts', methods=['GET'])
@jwt_required()
def get_my_doubts():
    user_id = get_jwt_identity()
    return MainController.fetch_my_doubts(user_id)


# ==========================================
# 📝 3. TEST SERIES & TEST ROUTES (STUDENT VIEW)
# ==========================================

@main_bp.route('/test-series', methods=['GET'])
def get_all_test_series():
    return MainTestController.fetch_all_series()


@main_bp.route('/tests/<int:test_id>', methods=['GET'])
@jwt_required()
def get_test_paper(test_id):
    return MainTestController.fetch_test_paper(test_id)


@main_bp.route('/tests/<int:test_id>/submit', methods=['POST'])
@jwt_required()
def submit_test(test_id):
    user_id = get_jwt_identity()
    return MainTestController.submit_test(user_id, test_id)


@main_bp.route('/my-test-attempts', methods=['GET'])
@jwt_required()
def get_my_test_attempts():
    user_id = get_jwt_identity()
    return MainTestController.fetch_student_attempts(user_id)


# ==========================================
# 🛠️ 4. ADMIN TEST ROUTES (UPLOAD QUESTIONS)
# ==========================================

@main_bp.route('/tests/<int:test_id>/questions', methods=['POST'])
@jwt_required()
def upload_questions(test_id):
    return MainTestController.upload_questions(test_id)