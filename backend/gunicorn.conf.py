"""Production server config. Used by Render/any PaaS: gunicorn -c gunicorn.conf.py app:app"""
import multiprocessing
import os

# Render supplies $PORT; fall back to 5000 for local use.
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# SQLite is a single-file database, so keep concurrency modest and use threads.
workers = 2
threads = 4
timeout = 120
accesslog = "-"
errorlog = "-"
loglevel = "info"
