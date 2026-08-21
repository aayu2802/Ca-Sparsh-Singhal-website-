from shared import db


class Role(db.Model):

    __tablename__ = "roles"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    role_name = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    description = db.Column(
        db.Text
    )


    permissions = db.relationship(
        "Permission",
        secondary="role_permissions",
        back_populates="roles",
        lazy="joined"
    )