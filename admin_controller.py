from flask import request
from app_admin.services.admin_service import AdminService
from shared.utils.response import api_response

class AdminController:
    # --- Course Management ---
    @staticmethod
    def add_course():
        data = request.get_json() or {}
        title = data.get('title')
        description = data.get('description')

        if not title:
            return api_response(
                success=False, 
                message="Course title is required", 
                status_code=400
            )

        course = AdminService.create_course(title, description)
        return api_response(
            success=True, 
            message="Course created successfully", 
            data=course.to_dict(), 
            status_code=201
        )

    @staticmethod
    def remove_course(course_id):
        success = AdminService.delete_course(course_id)
        if not success:
            return api_response(success=False, message="Course not found", status_code=404)
        
        return api_response(
            success=True, 
            message="Course deleted successfully", 
            status_code=200
        )

    # --- Doubt Management ---
    @staticmethod
    def fetch_all_doubts():
        doubts = AdminService.get_all_doubts()
        doubts_data = [d.to_dict() for d in doubts] if doubts else []
        return api_response(
            success=True, 
            message="All doubts fetched successfully", 
            data=doubts_data, 
            status_code=200
        )

    @staticmethod
    def resolve_doubt(doubt_id):
        data = request.get_json() or {}
        reply_text = data.get('reply')

        if not reply_text:
            return api_response(
                success=False, 
                message="Reply text is required", 
                status_code=400
            )

        doubt = AdminService.reply_to_doubt(doubt_id, reply_text)
        if not doubt:
            return api_response(success=False, message="Doubt not found", status_code=404)

        return api_response(
            success=True, 
            message="Doubt resolved successfully", 
            data=doubt.to_dict(), 
            status_code=200
        )
        
    
    @staticmethod
    def fetch_all_students():

        students = AdminService.get_all_students()

        return api_response(
            success=True,
            message="Students fetched successfully",
            data=[student.to_dict() for student in students],
            status_code=200
        )


    @staticmethod
    def fetch_student(student_id):

        student = AdminService.get_student(student_id)

        if not student:
            return api_response(
                success=False,
                message="Student not found",
                status_code=404
            )

        return api_response(
            success=True,
            message="Student fetched successfully",
            data=student.to_dict(),
            status_code=200
        )