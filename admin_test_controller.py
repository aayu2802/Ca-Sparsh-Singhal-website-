from flask import request, jsonify
from app_admin.services.admin_test_service import AdminTestService
from shared.utils.file_upload import save_pdf_file
from shared.utils.response import api_response
from flask_jwt_extended import get_jwt

class AdminTestController:

    @staticmethod
    def upload_test_pdf(test_id, pdf_type):
        # 1. File presence in request check
        if 'pdf' not in request.files:
            return api_response(False, "No PDF file provided", status_code=400)

        file = request.files['pdf']

        # 2. Check if file is selected (filename empty check)
        if file.filename == '' or file.filename is None:
            return api_response(False, "No file selected", status_code=400)

        # 3. Save PDF safely using helper function
        file_path, error = save_pdf_file(file)
        if error:
            return api_response(False, error, status_code=400)

        # 4. Attach PDF to test service
        test, err = AdminTestService.attach_test_pdf(test_id, file_path, pdf_type)
        if err:
            return api_response(False, err, status_code=404)

        return api_response(
            True, 
            f"{pdf_type.capitalize()} PDF uploaded successfully", 
            data=test.to_dict() if hasattr(test, 'to_dict') else test, 
            status_code=200
        )

    @staticmethod
    def create_series():
        data = request.get_json() or {}
        series, error = AdminTestService.create_test_series(data)
        if error:
            return api_response(False, error, status_code=400)
        
        series_data = series.to_dict() if hasattr(series, 'to_dict') else series
        return api_response(True, "Test series created successfully", data=series_data, status_code=201)

    @staticmethod
    def create_test():
        data = request.get_json() or {}
        test, error = AdminTestService.create_test(data)
        if error:
            return api_response(False, error, status_code=400)
        
        test_data = test.to_dict() if hasattr(test, 'to_dict') else test
        return api_response(True, "Test created successfully", data=test_data, status_code=201)

    @staticmethod
    def upload_questions(test_id):
        # Fix: test_id parameter added to accept route path variable
        data = request.get_json() or {}
        result, error = AdminTestService.upload_questions(test_id, data)
        if error:
            return api_response(False, error, status_code=400)
        
        result_data = result.to_dict() if hasattr(result, 'to_dict') else result
        return api_response(True, "Questions uploaded successfully", data=result_data, status_code=200)

    @staticmethod
    def fetch_answer_key(test_id):
        key, error = AdminTestService.get_answer_key(test_id)
        if error:
            return api_response(False, error, status_code=404)
        
        key_data = key.to_dict() if hasattr(key, 'to_dict') else key
        return api_response(True, "Answer key fetched successfully", data=key_data, status_code=200)
    
    @staticmethod
    def fetch_all_series():
        series = AdminTestService.get_all_test_series()

        return jsonify({
            "success": True,
            "series": [
                s.to_dict() for s in series
            ]
        }), 200
        
    @staticmethod
    def fetch_all_tests():
        tests = AdminTestService.get_all_tests()

        return jsonify({
            "success": True,
            "quizzes": [t.to_dict() for t in tests]
        }), 200
    @staticmethod
    def fetch_test(test_id):

        test = AdminTestService.get_test(test_id)

        if not test:
            return api_response(
                False,
                "Quiz not found",
                status_code=404
            )


        return api_response(
            True,
            "Quiz fetched successfully",
            data=test.to_dict(
                include_questions=True
            ),
            status_code=200
        )



    @staticmethod
    def update_test(test_id):

        data = request.get_json() or {}

        test, error = AdminTestService.update_test(
            test_id,
            data
        )


        if error:
            return api_response(
                False,
                error,
                status_code=400
            )


        return api_response(
            True,
            "Quiz updated successfully",
            data=test.to_dict(),
            status_code=200
        )



    @staticmethod
    def delete_test(test_id):

        success, error = AdminTestService.delete_test(
            test_id
        )


        if error:
            return api_response(
                False,
                error,
                status_code=404
            )


        return api_response(
            True,
            "Quiz deleted successfully",
            status_code=200
        )
        
    @staticmethod
    def fetch_uploaded_papers():

        papers = AdminTestService.get_uploaded_papers()

        return jsonify(papers), 200
        
    @staticmethod
    def fetch_answer_keys():

        keys = AdminTestService.get_uploaded_answer_keys()

        return jsonify({
            "success": True,
            "answer_keys": keys
        }), 200
        
    @staticmethod
    def download_paper(paper_id):
        return AdminTestService.download_paper(paper_id)
        
    @staticmethod
    def delete_series(series_id):

        series, error = AdminTestService.delete_test_series(series_id)

        if error:
            return api_response(
                False,
                error,
                status_code=400
            )

        return api_response(
            True,
            "Test series deleted successfully",
            status_code=200
        )