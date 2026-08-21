from shared import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


class Staff(db.Model):

    __tablename__ = "staff"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    full_name = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(150),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )

    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.id"),
        nullable=False
    )

    status = db.Column(
        db.Enum("Active", "Inactive"),
        default="Active"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


    role = db.relationship(
        "Role",
        backref="staff"
    )


    def set_password(self, raw_password):

        self.password = generate_password_hash(raw_password)


    def check_password(self, raw_password):

        return check_password_hash(
            self.password,
            raw_password
        )


    def to_dict(self):

        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role.role_name if self.role else None,
            "status": self.status
        }