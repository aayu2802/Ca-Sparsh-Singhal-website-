from flask import Flask, send_from_directory
from flask_cors import CORS
import os

from shared import db, jwt
from shared.config import Config

# Blueprints
from app_auth.routes import auth_bp
from app_main.routes import main_bp
from app_admin.routes import admin_bp


def create_app():

    app = Flask(__name__)

    # ==========================================
    # Load Config
    # ==========================================
    app.config.from_object(Config)


    # ==========================================
    # Database Config
    # ==========================================
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": 5,
        "max_overflow": 10
    }


    # ==========================================
    # Initialize Extensions
    # ==========================================
    db.init_app(app)
    jwt.init_app(app)



    # ==========================================
    # JWT Error Handlers
    # ==========================================

    @jwt.unauthorized_loader
    def jwt_missing_token(reason):

        print(
            "JWT MISSING TOKEN:",
            reason
        )

        return {
            "success": False,
            "error": reason
        }, 401



    @jwt.invalid_token_loader
    def jwt_invalid_token(reason):

        print(
            "JWT INVALID TOKEN:",
            reason
        )

        return {
            "success": False,
            "error": reason
        }, 401



    @jwt.expired_token_loader
    def jwt_expired_token(
        jwt_header,
        jwt_payload
    ):

        print(
            "JWT EXPIRED TOKEN"
        )

        return {
            "success": False,
            "error": "Token expired"
        }, 401



    @jwt.revoked_token_loader
    def jwt_revoked_token(
        jwt_header,
        jwt_payload
    ):

        print(
            "JWT REVOKED TOKEN"
        )

        return {
            "success": False,
            "error": "Token revoked"
        }, 401



    # ==========================================
    # CORS
    # ==========================================

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": app.config.get(
                    "CORS_ORIGINS",
                    "*"
                )
            }
        },
        supports_credentials=True
    )



    # ==========================================
    # Register Blueprints
    # ==========================================

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )


    app.register_blueprint(
        main_bp,
        url_prefix="/api"
    )


    app.register_blueprint(
        admin_bp,
        url_prefix="/api/admin"
    )



    # ==========================================
    # Load Models
    # ==========================================

    with app.app_context():

        from shared.models.user import User
        from shared.models.course import Course
        from shared.models.doubt import Doubt

        from shared.models.role import Role
        from shared.models.permission import Permission
        from shared.models.role_permission import RolePermission
        from shared.models.staff import Staff


        db.create_all()



    return app





# ==========================================
# Application Instance
# ==========================================

app = create_app()



# ==========================================
# React Frontend
# ==========================================

FRONTEND_DIR = "/home/knlikqmu/admin.casparshsinghal.in"



@app.route("/")
def index():

    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )



@app.route("/<path:path>")
def react_routes(path):

    file_path = os.path.join(
        FRONTEND_DIR,
        path
    )


    if os.path.isfile(file_path):

        return send_from_directory(
            FRONTEND_DIR,
            path
        )


    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )




# ==========================================
# Create Super Admin CLI
# ==========================================

@app.cli.command("create-admin")
def create_admin():

    from shared.models.staff import Staff
    from shared.models.role import Role


    existing = Staff.query.filter_by(
        email="admin@sparsh.com"
    ).first()


    if existing:

        print(
            "Super Admin already exists"
        )

        return



    role = Role.query.filter_by(
        role_name="Super Admin"
    ).first()



    if not role:

        print(
            "Super Admin role missing"
        )

        return



    admin = Staff(
        full_name="Super Admin",
        email="admin@sparsh.com",
        role_id=role.id,
        status="Active"
    )


    admin.set_password(
        "Sparsh@2602"
    )


    db.session.add(admin)

    db.session.commit()


    print(
        "Super Admin Created Successfully"
    )




# ==========================================
# Local Run
# ==========================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )