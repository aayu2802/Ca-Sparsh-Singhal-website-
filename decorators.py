from functools import wraps
from flask_jwt_extended import get_jwt_identity, get_jwt
from shared.models.staff import Staff
from shared.utils.response import api_response


def _get_current_staff():
    """Helper function to fetch and validate staff identity from JWT token safely."""
    claims = get_jwt()
    
    # Strictly reject student tokens trying to access staff routes
    if not claims.get("is_staff", False):
        return None, api_response(
            success=False,
            message="Access denied. Valid staff privileges required.",
            status_code=403
        )

    jwt_identity = get_jwt_identity()

    if isinstance(jwt_identity, dict):
        staff_id = jwt_identity.get("id")
    else:
        staff_id = jwt_identity

    try:
        staff_id = int(staff_id)
    except (ValueError, TypeError):
        return None, api_response(
            success=False,
            message="Invalid access token format",
            status_code=401
        )

    staff = Staff.query.get(staff_id)

    if not staff or not getattr(staff, 'is_active', True):
        return None, api_response(
            success=False,
            message="Account is inactive or does not exist",
            status_code=401
        )

    return staff, None


def super_admin_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def permission_required(required_permission):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator