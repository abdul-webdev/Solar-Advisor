from flask import Flask
from flask_cors import CORS

from app.database import init_db
from app.routes.api import bp


def create_app():
    app = Flask(__name__)
    # supports_credentials lets the session cookie travel when the frontend is
    # served from a different origin than the API (e.g. a dev proxy or preview).
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    init_db()
    app.register_blueprint(bp, url_prefix="/api")
    return app
