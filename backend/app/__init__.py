from flask import Flask
from flask_cors import CORS

from app.database import init_db
from app.routes.api import bp


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    init_db()
    app.register_blueprint(bp, url_prefix="/api")
    return app
