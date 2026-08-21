from flask import request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    get_jwt
)

from shared.models.user import User
from shared.models.staff import Staff
from shared import db
from shared.utils.response import api_response


class AuthController:


    @staticmethod
    def register():

        data = request.get_json() or {}

        email = data.get("email", "").strip().lower()
        password = data.get("password")
        name = data.get("name", "").strip()


        if not email or not password:
            return api_response(
                success=False,
                message="Email and password are required",
                status_code=400
            )


        if User.query.filter_by(email=email).first():
            return api_response(
                success=False,
                message="User with this email already exists",
                status_code=400
            )


        try:

            user = User(
                name=name,
                email=email
            )

            user.set_password(password)

            db.session.add(user)
            db.session.commit()


            user_id = str(user.id)


            claims = {
                "is_staff": False,
                "role": "student"
            }


            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=claims
            )


            refresh_token = create_refresh_token(
                identity=user_id,
                additional_claims=claims
            )


            return api_response(
                success=True,
                message="User registered successfully",
                data={
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "user": user.to_dict()
                },
                status_code=201
            )


        except Exception as e:

            db.session.rollback()

            return api_response(
                success=False,
                message="Failed to register user",
                data={"details": str(e)},
                status_code=500
            )



    @staticmethod
    def login():

        data = request.get_json() or {}

        email = data.get("email", "").strip().lower()
        password = data.get("password")


        if not email or not password:
            return api_response(
                success=False,
                message="Email and password are required",
                status_code=400
            )


        user = User.query.filter_by(email=email).first()


        if not user or not user.check_password(password):

            return api_response(
                success=False,
                message="Invalid credentials",
                status_code=401
            )


        user_id = str(user.id)


        claims = {
            "is_staff": False,
            "role": "student"
        }


        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=claims
        )


        refresh_token = create_refresh_token(
            identity=user_id,
            additional_claims=claims
        )


        return api_response(
            success=True,
            message="Login successful",
            data={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user.to_dict()
            },
            status_code=200
        )



    @staticmethod
    def staff_login():

        data = request.get_json() or {}


        email = data.get("email", "").strip().lower()
        password = data.get("password")


        if not email or not password:

            return api_response(
                success=False,
                message="Email and password are required",
                status_code=400
            )


        staff = Staff.query.filter_by(
            email=email
        ).first()



        if not staff or not staff.check_password(password):

            return api_response(
                success=False,
                message="Invalid staff credentials",
                status_code=401
            )



        staff_id = str(staff.id)



        role_name = "staff"

        permissions = []



        if staff.role:

            role_name = staff.role.role_name


            if hasattr(staff.role, "permissions"):

                permissions = [
                    permission.permission_key
                    for permission in staff.role.permissions
                ]



        claims = {

            "is_staff": True,

            "role": role_name,

            "staff_id": staff_id,

            "permissions": permissions
        }



        access_token = create_access_token(
            identity=staff_id,
            additional_claims=claims
        )


        refresh_token = create_refresh_token(
            identity=staff_id,
            additional_claims=claims
        )



        return api_response(

            success=True,

            message="Staff login successful",

            data={

                "access_token": access_token,

                "refresh_token": refresh_token,

                "staff": staff.to_dict(),

                "permissions": permissions

            },

            status_code=200

        )



    @staticmethod
    def get_profile():

        claims = get_jwt()


        if claims.get("is_staff", False):

            return api_response(
                success=False,
                message="Staff accounts must use /me endpoint",
                status_code=403
            )


        current_user_id = get_jwt_identity()


        user = User.query.get(
            int(current_user_id)
        )


        if not user:

            return api_response(
                success=False,
                message="User not found",
                status_code=404
            )


        return api_response(
            success=True,
            message="User profile fetched",
            data=user.to_dict(),
            status_code=200
        )



    @staticmethod
    def get_me():

        current_id = get_jwt_identity()

        claims = get_jwt()

        is_staff = claims.get(
            "is_staff",
            False
        )


        if is_staff:

            staff = Staff.query.get(
                int(current_id)
            )


            if staff:

                data = staff.to_dict()

                data["account_type"] = "staff"

                data["permissions"] = claims.get(
                    "permissions",
                    []
                )


                return api_response(
                    success=True,
                    message="Staff identity fetched",
                    data=data,
                    status_code=200
                )


        else:

            user = User.query.get(
                int(current_id)
            )


            if user:

                data = user.to_dict()

                data["account_type"] = "student"


                return api_response(
                    success=True,
                    message="User profile fetched",
                    data=data,
                    status_code=200
                )


        return api_response(
            success=False,
            message="Account details not found",
            status_code=404
        )



    @staticmethod
    def refresh():

        identity = get_jwt_identity()

        old_claims = get_jwt()


        is_staff = old_claims.get(
            "is_staff",
            False
        )


        role = old_claims.get(
            "role",
            "staff" if is_staff else "student"
        )


        new_claims = {

            "is_staff": is_staff,

            "role": role

        }



        if is_staff:

            staff = Staff.query.get(
                int(identity)
            )


            permissions = []


            if staff and staff.role:

                permissions = [
                    permission.permission_key
                    for permission in staff.role.permissions
                ]


            new_claims["staff_id"] = str(identity)

            new_claims["permissions"] = permissions



        new_access_token = create_access_token(

            identity=str(identity),

            additional_claims=new_claims

        )


        return api_response(

            success=True,

            message="Token refreshed",

            data={
                "access_token": new_access_token
            },

            status_code=200

        )