import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from app.database import init_db
from app.routes.api import bp

# Built React app. In production the frontend is compiled into frontend/dist and
# served by Flask, so the whole application is one deployable service.
FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
)


def create_app():
    app = Flask(__name__, static_folder=None)
    # supports_credentials lets the session cookie travel when the frontend is
    # served from a different origin than the API (e.g. a dev proxy or preview).
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    init_db()
    app.register_blueprint(bp, url_prefix="/api")

    if os.path.isdir(FRONTEND_DIST):
        @app.get("/")
        def index():
            return send_from_directory(FRONTEND_DIST, "index.html")

        @app.get("/<path:path>")
        def static_files(path):
            candidate = os.path.join(FRONTEND_DIST, path)
            if os.path.isfile(candidate):
                return send_from_directory(FRONTEND_DIST, path)
            # Client-side routing: unknown paths fall through to the SPA shell.
            return send_from_directory(FRONTEND_DIST, "index.html")

        # Serve the SPA without caching the shell, so a redeploy is picked up.
        @app.after_request
        def no_cache_shell(response):
            if response.mimetype == "text/html":
                response.headers["Cache-Control"] = "no-store"
            return response

    return app
