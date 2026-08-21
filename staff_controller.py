from flask import request
from app_admin.services.staff_service import StaffService
from shared.utils.response import api_response

class StaffController:
    @staticmethod
    def add_staff():
        data = request.get_json() or {}

        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        permissions = data.get('permissions', [])
        role_id = data.get('role_id')

        if not email or not password or not name:
            return api_response(
                False,
                "Name, email, and password are required",
                status_code=400
            )


        staff, error = StaffService.create_staff_member(
            name,
            email,
            password,
            role_id,
            permissions
        )


        if error:
            return api_response(
                False,
                error,
                status_code=400
            )


        return api_response(
            True,
            "Staff member created successfully",
            data=staff.to_dict(),
            status_code=201
        )

    @staticmethod
    def fetch_all_staff():
        staff_list = StaffService.get_all_staff()
        data = [s.to_dict() for s in staff_list] if staff_list else []
        return api_response(True, "Staff members fetched", data=data, status_code=200)

    @staticmethod
    def modify_staff_access(staff_id):
        data = request.get_json() or {}
        permissions = data.get('permissions')
        is_active = data.get('is_active')

        staff, error = StaffService.update_staff_access(staff_id, permissions, is_active)
        if error:
            return api_response(False, error, status_code=404)

        return api_response(True, "Staff permissions updated", data=staff.to_dict(), status_code=200)

    @staticmethod
    def remove_staff(staff_id):
        success = StaffService.delete_staff(staff_id)
        if not success:
            return api_response(False, "Staff member not found or cannot be deleted", status_code=404)

        return api_response(True, "Staff member deleted successfully", status_code=200)