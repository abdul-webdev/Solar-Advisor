# Deploying Solar Advisor (free hosting)

The app deploys as **one web service**: Flask serves the REST API *and* the built React
frontend, so there is no CORS wiring and no second service to keep alive.

Everything is pre-configured — you only need a hosting account.

---

## Option A — Render (recommended, free, no CLI)

1. Push this repository to GitHub (already done).
2. Sign up at <https://render.com> and choose **New → Blueprint**.
3. Select the `Solar-Advisor` repository. Render reads `render.yaml` automatically.
4. Click **Apply**. The build takes ~3–5 minutes.

Render assigns your service a URL such as `https://<your-service-name>.onrender.com` and shows
it in the dashboard once the deploy finishes.

**What `render.yaml` does**

| Setting | Value |
| --- | --- |
| Build | `./build.sh` — installs Python deps, runs `npm ci`, builds the React app into `frontend/dist` |
| Start | `cd backend && gunicorn --config gunicorn.conf.py wsgi:app` |
| Health check | `/api/health` |
| Database | SQLite persisted on a 1 GB disk mounted at `/var/data` |
| Secret | `SOLAR_SECRET` generated automatically |

### Free-plan caveat (important)

Render's free instances **sleep after ~15 minutes of inactivity** and take about 50 seconds to
wake on the next visit. A second free instance can also be unavailable while it wakes. This is a
Render policy, not a bug in the app:

- For a demo or viva, open the link a minute before you present so it's already awake.
- To keep it always-on, use Render's paid tier, or Option B below.

---

## Option B — any PAAS / VPS with Docker or Python

```bash
./build.sh                                  # builds frontend/dist + installs deps
cd backend
gunicorn --config gunicorn.conf.py wsgi:app # serves API + SPA on $PORT
```

Set these environment variables in your host's dashboard:

| Variable | Purpose |
| --- | --- |
| `SOLAR_SECRET` | Signs session tokens. Set a long random value. |
| `SOLAR_DB_PATH` | Where the SQLite file lives (point at persistent storage). |
| `PORT` | Usually injected by the platform. |

---

## Option C — demoing without any hosting account

If you cannot create a hosting account before a deadline, present the app running locally. It
needs **one** process, not two:

```bash
cd frontend && npm install && npm run build && cd ..
pip install -r backend/requirements.txt
cd backend && python run.py
```

Flask serves the complete product — interface and API — from a single port, so there is nothing
else to start and nothing that can drift out of sync. This is the same command the README's
"Run it" section uses.

---

## What gets deployed

- The SQLite database is created and **seeded automatically on first boot** with the demo users,
  20 appliances, 12 knowledge facts, 11 expert rules and 18 equipment records.
- Demo credentials: `user@example.com` / `User@12345` and `admin@solaradvisor.com` / `Admin@12345`.
- `node_modules/`, `frontend/dist/` and `*.db` stay out of Git; the build regenerates them.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Page loads but API calls fail | The build did not produce `frontend/dist`. Check the build log for `npm ci` errors, then redeploy. |
| `Worker failed to boot` | A Python dependency is missing — confirm the build ran `pip install -r backend/requirements.txt`. |
| Login works, then 401s | `SOLAR_SECRET` changed between deploys, invalidating old tokens. Sign in again. |
| Data disappears after a redeploy | `SOLAR_DB_PATH` is not pointing at the mounted disk. Use `/var/data/solar_advisor.db`. |
| First load is very slow | Free instance was asleep. Reload after ~50 seconds. |
