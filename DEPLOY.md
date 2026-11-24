# Deploying Solar Advisor (no credit card required)

There are two ways to run this project, and the first one needs **no hosting account, no card and
no server**.

| | Live URL | Accounts & saved data | Cost |
| --- | --- | --- | --- |
| **A. GitHub Pages demo** (recommended) | `https://abdul-webdev.github.io/Solar-Advisor/` | No — expert system runs in the browser | Free, no card |
| **B. Full stack** (Flask + SQLite) | anywhere you can run a server | Yes — login, roles, admin CRUD, history | Free options below |

---

## A. GitHub Pages — nothing to sign up for

The repository already contains a complete browser build of the expert system in [`demo/`](demo/README.md),
plus a workflow that builds and verifies it. **Pages only needs to be switched on once.**

### Turn it on (one click)

1. Open <https://github.com/abdul-webdev/Solar-Advisor/settings/pages>
2. Under **Build and deployment → Source**, choose **GitHub Actions**

That is the whole setup. The next push (or a re-run of the workflow from the **Actions** tab)
publishes the site to `https://abdul-webdev.github.io/Solar-Advisor/`.

Alternatively, add this file through the GitHub web editor and run it once from the **Actions** tab:

```yaml
# .github/workflows/enable-pages.yml
name: Enable Pages
on: workflow_dispatch
permissions:
  pages: write
  id-token: write
  contents: read
jobs:
  enable:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/configure-pages@v5
        with:
          enablement: true
```

### Why Pages and not a Python host?

GitHub Pages serves static files only, so it cannot run Flask. The `demo/` build therefore ports
the expert system — the same formulas, the same 11 database rules, the same explanation text — to
run in the browser. Parity with the Python engine is enforced by `npm test` in CI, not assumed.

What the Pages site does **not** have: login, roles, saved recommendations and admin CRUD. Those
need a server, which is option B.

---

## B. Full stack — free hosts that do not ask for a card

> **Render's free tier now asks for a payment method at sign-up**, so it is no longer a
> no-card option. The hosts below do not.

### B1. GitHub Codespaces — one click, free hours, no card

The repo includes a [dev container](.devcontainer/devcontainer.json), so the full application
starts by itself — no terminal commands.

1. On the repository page: **Code → Codespaces → Create codespace on main**
2. Wait for the container to build (a few minutes the first time). It automatically installs
   dependencies, builds the frontend and starts the app.
3. Open the **Ports** tab, click port **5000** (labelled *Solar Advisor*). If a
   "This site can't be reached" page appears, right-click the port → *Port visibility* → **Public**.

You now have a real URL like `https://<codespace-name>-5000.app.github.dev` running the complete
application: login, both roles, saved recommendations, the admin console and the rule sandbox.

Verified locally with the container's exact commands: `/` serves the built interface, `/api/health`
returns 200, both demo accounts log in, an administrator reaches `/api/admin/stats` (200) while a
general user is refused (403), and the reference consultation returns 2,112 W / 3 kW / 3,300 Wp / 8.2 h.

The Codespace stops when idle; reopening it restarts the app automatically. Personal accounts get
free monthly hours, and no payment method is required. If you run out, B2 works too.

### B2. PythonAnywhere — free tier, no card

1. Sign up at <https://www.pythonanywhere.com> (the free "Beginner" account).
2. **Files → Open Bash console**, then:

```bash
git clone https://github.com/abdul-webdev/Solar-Advisor.git
cd Solar-Advisor
pip3 install --user -r backend/requirements.txt
cd frontend && npm install && npm run build && cd ..   # needs Node; skip if unavailable
```

If the free account has no Node.js, build `frontend/dist` locally and upload it with the Files tab,
or skip the frontend build and use the Pages demo for the interface.

3. **Web → Add a new web app → Manual configuration → Python 3.11**, then edit the WSGI file to:

```python
import sys
sys.path.insert(0, '/home/<your-username>/Solar-Advisor/backend')
from wsgi import app as application
```

4. Set the **Source code** and **Working directory** to `/home/<your-username>/Solar-Advisor`, then
   **Reload**. Your app is at `https://<your-username>.pythonanywhere.com`.

### B3. Any VPS or Docker host

```bash
./build.sh
cd backend && gunicorn --config gunicorn.conf.py wsgi:app
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `SOLAR_SECRET` | Signs session tokens — set a long random value |
| `SOLAR_DB_PATH` | SQLite file location (point at persistent storage) |
| `PORT` | Injected by most platforms |

`render.yaml` is still included for anyone who already has a Render account: connect the repo,
choose **New → Blueprint**, and it deploys as one service.

---

## C. Demo locally — no account at all

```bash
cd frontend && npm install && npm run build && cd ..
pip install -r backend/requirements.txt
cd backend && python run.py
```

Open the URL it prints. One process serves the interface **and** the API, and the database seeds
itself with the demo accounts on first start.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Pages URL shows 404 | Pages is not enabled yet — do step A1, then re-run the workflow from the Actions tab. |
| Pages deploy job is skipped | No Pages site exists yet; the build and its downloadable artifact still succeed. |
| Page loads but API calls fail (option B) | `frontend/dist` was not built. Check the build log for `npm` errors. |
| `Worker failed to boot` | A Python dependency is missing — run `pip install -r backend/requirements.txt`. |
| Login works, then 401s | `SOLAR_SECRET` changed between restarts, invalidating old tokens. Sign in again. |
| Data disappears after redeploy | `SOLAR_DB_PATH` is not on persistent storage. |
