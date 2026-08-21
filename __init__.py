from shared.models.user import User
from shared.models.course import Course
from shared.models.doubt import Doubt

from shared.models.role import Role
from shared.models.permission import Permission
from shared.models.role_permission import RolePermission
from shared.models.staff import Staff


__all__ = [
    "User",
    "Course",
    "Doubt",
    "Role",
    "Permission",
    "RolePermission",
    "Staff"
]