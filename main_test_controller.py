from flask import request
from app_main.services.main_test_service import MainTestService
from shared.utils.response import api_response

class MainTestController:
    @staticmethod
    def fetch_all_series():
        series = MainTestService.get_all_series()
        data = [s.to_dict() for s in series] if series else []
        return api_response(
            success=True, 
            message="Test series fetched successfully", 
            data=data, 
            status_code=200
        )

    @staticmethod
    def fetch_test_paper(test_id):
        test_data = MainTestService.get_test_for_student(test_id)
        if not test_data:
            return api_response(
                success=False, 
                message="Test paper not found", 
                status_code=404
            )
        return api_response(
            success=True, 
            message="Test paper fetched successfully", 
            data=test_data, 
            status_code=200
        )

    @staticmethod
    def submit_test(user_id, test_id):
        data = request.get_json() or {}
        answers = data.get('answers', {})  # Dictionary format: {"question_id": "A"}

        evaluation, error = MainTestService.submit_and_evaluate_test(user_id, test_id, answers)
        if error:
            return api_response(
                success=False, 
                message=error, 
                status_code=400
            )

        return api_response(
            success=True, 
            message="Test submitted and evaluated successfully", 
            data=evaluation, 
            status_code=200
        )

    @staticmethod
    def fetch_student_attempts(user_id):
        attempts = MainTestService.get_user_attempts(user_id)
        data = [a.to_dict() for a in attempts] if attempts else []
        return api_response(
            success=True, 
            message="Test history fetched successfully", 
            data=data, 
            status_code=200
        )

    # ==========================================
    # 🛠️ FIX ADDED: UPLOAD QUESTIONS METHOD
    # ==========================================
    @staticmethod
    def upload_questions(test_id):
        # Request body se JSON data/questions read karein
        data = request.get_json() or {}
        questions_data = data.get('questions', [])

        if not questions_data:
            return api_response(
                success=False,
                message="No questions data provided",
                status_code=400
            )

        # Service layer ko call karke questions process karein
        result, error = MainTestService.upload_questions_for_test(test_id, questions_data)
        
        if error:
            return api_response(
                success=False,
                message=error,
                status_code=400
            )

        return api_response(
            success=True,
            message="Questions uploaded successfully",
            data=result,
            status_code=201
        )