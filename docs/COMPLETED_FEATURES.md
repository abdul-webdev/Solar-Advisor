# Completed features & limitations

## Core requirements

| Requirement | Status | Where |
| --- | --- | --- |
| Registration, login, logout | ✅ | `pages/Auth.jsx`, `POST /api/auth/*` |
| Password hashing (PBKDF2) | ✅ | `app/auth.py` (`generate_password_hash` / `check_password_hash`) |
| Token-based sessions | ✅ | HMAC-SHA256 signed stdlib tokens, `Authorization: Bearer` |
| Role-based access (General User / Administrator) | ✅ | `require_auth` / `require_admin`, 403 enforced server-side |
| Conversational advisor | ✅ | `pages/ChatAdvisor.jsx` + `POST /api/chat` |
| NLP extraction of appliances, quantities, wattage, hours, backup | ✅ | `expert_system/nlp.py` |
| Clarification questions instead of guessing | ✅ | chat route: no backup → asks, no sizing run |
| Loading state & clear chat | ✅ | checklist + progress bar; `DELETE /api/chat/history` |
| Database-driven IF-THEN rules with priorities | ✅ | `expert_rules` table, `inference_engine.py` |
| Triggered rule IDs, working memory, traces | ✅ | `triggered_rules`, `inference_traces` table |
| Explanation facility | ✅ | `explanation.py` + per-rule templates |
| Connected load, daily energy, backup energy | ✅ | `calculations.py` |
| Battery Ah / kWh with DoD + efficiency | ✅ | `battery_nominal_wh`, `battery_capacity_ah` |
| PV Wp with peak sun hours + PR + reserve | ✅ | `pv_capacity_wp`, `panel_count` |
| Inverter kVA/kW with design margin | ✅ | `required_inverter_w`, `select_inverter` |
| Recommendation dashboard (cards, chart, table) | ✅ | `pages/Recommendations.jsx` (Recharts bar chart + appliance table) |
| Save / view / delete recommendations | ✅ | `/api/recommendations*`, scoped per user |
| Knowledge base CRUD (admin) | ✅ | `pages/admin/AdminKnowledge.jsx` |
| Knowledge base read-only browsing (user) | ✅ | `pages/UserPages.jsx` → `KnowledgeBase` (published facts only; role banner explains the limit) |
| Admin configuration not exposed to users | ✅ | `GET /api/settings` admin-only; `GET /api/settings/public` returns just the published assumptions |
| Active-only rule set for users | ✅ | `/api/rules` filters out inactive/draft rules for non-admins |
| Admin dashboard with statistics | ✅ | `pages/admin/AdminDashboard.jsx` |
| Rule management + rule testing | ✅ | `AdminRules.jsx`, `AdminTestRules.jsx` |
| Equipment management (panels, inverters, batteries) | ✅ | `AdminEquipment.jsx` |
| Inference trace viewer | ✅ | `AdminTraces.jsx` |
| User management | ✅ | `AdminUsers.jsx` (role, status, invite, delete) |
| System settings | ✅ | `AdminSettings.jsx` (engineering defaults, registration policy) |
| All 10 required DB tables | ✅ | `app/database.py` |
| Seed data | ✅ | 6 users, 20 appliances, 12 facts, 11 rules, 18 equipment records |
| Automated tests | ✅ | 27 passing tests incl. full workflow |
| Figma-matched UI | ✅ | navy sidebar, blue accents, Inter, 12px corners, matching copy & modals |
| Responsive layout | ✅ | mobile drawer + stacked grids; bottom of sidebar collapses on small screens |
| No dead buttons | ✅ | every control performs an API action or opens a labelled dialog |
| Works without an AI API key | ✅ | pattern/dictionary NLP only; no external calls |

## Deliberate simplifications / limitations

1. **PDF export** — "Download PDF" triggers the browser print dialog on the report page (styled
   for print with `.no-print` rules) after showing the "Your report is ready" dialog. No server-side
   PDF library is bundled, so nothing extra needs installing on Windows.
2. **Email** — the Contact form and "email me when a report is ready" preference are stored in
   the database (`contact_messages`, account settings) but no SMTP provider is configured, so no
   real email is sent. The confirmation dialog says the message is *queued for support*.
3. **Appliance usage hours** — when the user does not state per-appliance hours, the database
   typical value is used. These are labelled "Nameplate values assumed. Confirm to refine."
4. **NLP is rule/pattern based** — it handles the appliance vocabulary in the database plus
   common synonyms and quantities (numeric and word form). Unusual appliance names need to be
   added through Knowledge management → Appliance catalogue. There is no LLM fallback by design.
5. **Invited users** — "Invite user" creates a General User account with a generated temporary
   password that is displayed once in the UI for the administrator to share; there is no email
   invitation flow.
6. **Sizing is preliminary** — inverter surge compatibility, cable sizing, earthing, shading and
   local standards are explicitly out of scope and flagged in the UI and in every report.
7. **SQLite concurrency** — adequate for a demo/single-server deployment; a production deployment
   with concurrent writers would move to PostgreSQL.
8. **Inference traces** are capped at the 50 most recent runs in the viewer endpoint.
9. **Static demo scope** — the GitHub Pages build runs the full expert system in the browser but
   has no accounts, saved history or admin CRUD, since those require a server. The complete
   implementation is in the repository and runs via Codespaces, PythonAnywhere, or any VPS
   (see DEPLOY.md).

## Deployment

**No card is required for either route.** GitHub Pages serves a browser port of the expert system
(parity tested against the Python engine), and a dev container lets GitHub Codespaces run the full
Flask + SQLite application with one click. Render is available via `render.yaml` but its free tier
now asks for a payment method, so it is documented as an alternative rather than the default.

The app ships as a **single deployable service**: `build.sh` compiles the React app into
`frontend/dist` and Flask serves it alongside the REST API, so there is no CORS configuration and
no second service. `render.yaml` makes this a one-click Blueprint deploy on Render, with the
SQLite file on a mounted persistent disk and `SOLAR_SECRET` generated automatically.
A GitHub Actions workflow (`.github/workflows/ci.yml`) runs the 39 tests and builds the frontend
on every push to `main`. See [DEPLOY.md](../DEPLOY.md).

## Verification performed

- `python -m pytest tests -q` → **39 passed**.

### RBAC audit (`tests/test_rbac_exhaustive.py`)

Instead of spot-checking, this test walks Flask's URL map and calls **every**
`/api/admin/*` route × method as a general user and as an anonymous caller; any
route answering anything other than 401/403 fails the build. It also verifies:

- draft knowledge facts never appear in a general user's listing;
- a user cannot PATCH or DELETE a fact, rule, appliance or equipment record;
- a user cannot read or delete another user's recommendation (404, not 403-leak);
- an administrator cannot change their own role or delete their own account;
- `/api/settings` is admin-only while `/api/settings/public` serves the labelled assumptions.
- Live end-to-end check against the running servers: login → chat (example sentence) → 2,112 W
  connected load, 3 kW inverter, 6 × 550 W = 3.3 kWp array, 51.2 V / 150 Ah battery giving
  ~8.2 h backup → report retrievable → admin sandbox run → trace recorded.
- General-user requests to `/api/admin/stats` return **403**.
- Frontend production build (`npm run build`) completes with no errors.
