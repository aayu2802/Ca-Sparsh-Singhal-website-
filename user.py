from shared.models.course import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


# ==========================================
# 🎓 STUDENT MODEL (users table)
# ==========================================
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(db.String(100), nullable=False)

    email = db.Column(db.String(150), unique=True, nullable=False)

    username = db.Column(db.String(50), unique=True, nullable=False)

    password = db.Column(db.String(255), nullable=False)

    preparing_for = db.Column(db.String(50), nullable=False)

    target_attempt = db.Column(db.String(30), nullable=False)

    srn = db.Column(db.String(30), unique=True, nullable=False)

    mrn = db.Column(db.String(30), unique=True)

    city = db.Column(db.String(100), nullable=False)

    email_verified = db.Column(db.Boolean, default=False)

    status = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


    def set_password(self, password):
        self.password = generate_password_hash(password)


    def check_password(self, password):
        return check_password_hash(self.password, password)


    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "username": self.username,
            "preparing_for": self.preparing_for,
            "target_attempt": self.target_attempt,
            "srn": self.srn,
            "mrn": self.mrn,
            "city": self.city,
            "email_verified": self.email_verified,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
            if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            if self.updated_at else None,
        }