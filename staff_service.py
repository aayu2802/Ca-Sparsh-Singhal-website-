from shared import db
from shared.models.staff import Staff
from shared.models.role import Role


class StaffService:

    @staticmethod
    def create_staff_member(name, email, password, role_id=None, permissions=None):

        if Staff.query.filter_by(email=email).first():
            return None, "Staff with this email already exists"


    # Role select karo
        if role_id:
            role = Role.query.get(int(role_id))
        else:
            role = Role.query.filter_by(
                role_name="Faculty"
            ).first()


        if not role:
            return None, "Role not found"


        staff = Staff(
            full_name=name,
            email=email,
            role_id=role.id,
            status="Active"
        )


        staff.set_password(password)


        db.session.add(staff)
        db.session.commit()


        return staff, None



    @staticmethod
    def get_all_staff():

        return Staff.query.all()



    @staticmethod
    def update_staff_access(staff_id, permissions=None, is_active=None):

        staff = Staff.query.get(staff_id)


        if not staff:
            return None, "Staff member not found"


        if is_active is not None:

            staff.status = (
                "Active"
                if is_active
                else "Inactive"
            )


        db.session.commit()


        return staff, None



    @staticmethod
    def delete_staff(staff_id):

        staff = Staff.query.get(staff_id)


        if not staff:
            return False


        if staff.role and staff.role.role_name == "Super Admin":
            return False


        db.session.delete(staff)

        db.session.commit()


        return True