from shared import db
from shared.models.user import User

class AuthService:
    @staticmethod
    def register_user(name, email, password):
        # Email lookup standard normalization ke saath
        clean_email = email.strip().lower() if email else ""
        
        if User.query.filter_by(email=clean_email).first():
            return None, "User with this email already exists"

        user = User(name=name, email=clean_email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        return user, None

    @staticmethod
    def authenticate_user(email, password):
        clean_email = email.strip().lower() if email else ""
        user = User.query.filter_by(email=clean_email).first()
        
        if not user or not user.check_password(password):
            return None, "Invalid email or password"
        return user, None

    @staticmethod
    def get_user_by_id(user_id):
        # Ensure user_id standard format/integer handle kar sake
        try:
            return User.query.get(int(user_id))
        except (ValueError, TypeError):
            return User.query.get(user_id)