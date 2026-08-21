from flask import request
from app_main.services.main_service import MainService
from shared.utils.response import api_response

class MainController:
    # --- Courses ---
    @staticmethod
    def fetch_courses():
        courses = MainService.get_all_courses()
        courses_data = [c.to_dict() for c in courses] if courses else []
        return api_response(
            success=True, 
            message="Courses fetched successfully", 
            data=courses_data, 
            status_code=200
        )

    @staticmethod
    def fetch_course_by_id(course_id):
        # Service returns tuple: (course_object, error_message)
        course, error = MainService.get_course_details(course_id)
        if error:
            return api_response(
                success=False, 
                message=error, 
                status_code=404
            )
        
        return api_response(
            success=True, 
            message="Course found", 
            data=course.to_dict() if hasattr(course, 'to_dict') else course, 
            status_code=200
        )

    # --- Doubts ---
    @staticmethod
    def add_doubt(user_id):
        data = request.get_json() or {}
        title = data.get('title')
        description = data.get('description')
        course_id = data.get('course_id')

        if not title or not description:
            return api_response(
                success=False, 
                message="Title and description are required", 
                status_code=400
            )

        if not course_id:
            return api_response(
                success=False, 
                message="Course ID is required", 
                status_code=400
            )

        # Service returns tuple: (doubt_object, error_message)
        doubt, error = MainService.create_student_doubt(
            title=title, 
            description=description, 
            course_id=course_id, 
            user_id=user_id
        )
        
        if error:
            return api_response(
                success=False, 
                message=error, 
                status_code=400
            )

        return api_response(
            success=True, 
            message="Doubt submitted successfully", 
            data=doubt.to_dict() if hasattr(doubt, 'to_dict') else doubt, 
            status_code=201
        )

    @staticmethod
    def fetch_my_doubts(user_id):
        doubts = MainService.get_user_doubts(user_id)
        doubts_data = [d.to_dict() for d in doubts] if doubts else []
        return api_response(
            success=True, 
            message="User doubts fetched successfully", 
            data=doubts_data, 
            status_code=200
        )