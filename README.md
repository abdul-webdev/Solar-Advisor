# Solar Microgrid & Home Inverter Sizing Advisor

A conversational, **rule-based expert system** that sizes a solar panel array, inverter and battery bank
from a household's electricity needs described in plain language — and explains every number it produces.

Built with **React + Vite + Tailwind CSS + Lucide + Recharts** on the front end and
**Python Flask + Flask-CORS + SQLite** on the back end. All engineering logic runs on the server;
the front end never calculates or hardcodes a recommendation.

---

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| General user | `user@example.com` | `User@12345` |
| Administrator / Solar expert | `admin@solaradvisor.com` | `Admin@12345` |

These are created automatically the first time the app initialises an empty database.

---

## Quick start (Windows)

Requirements: **Python 3.10+** and **Node.js 18+** (tested on Python 3.11 / Node 22).

### 1. Backend (terminal 1)

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The API runs at **http://localhost:5000**. On first start it creates `backend\solar_advisor.db`
and seeds demo users, 20 appliances, 12 knowledge facts, 11 expert rules and 18 equipment records.

Optional — verify the install with the test suite (27 tests):

```bat
python -m pytest tests -q
```

### 2. Frontend (terminal 2)

```bat
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api/*` to `http://localhost:5000`, so no extra
configuration or CORS setup is needed for local development.

### Quick start (macOS / Linux)

```bash
cd backend && python3 -m venv venv && source venv/bin/activate \
  && pip install -r requirements.txt && python run.py

# second terminal
cd frontend && npm install && npm run dev
```

### Production build (optional)

```bash
cd frontend && npm run build      # outputs frontend/dist
```

---

## How the expert system works

Every consultation runs the same four-stage pipeline:

```
Natural language ─▶ 1. NLP extraction ─▶ 2. Calculation engine ─▶ 3. IF-THEN rule engine ─▶ 4. Explanation facility
                          (nlp.py)              (calculations.py)        (inference_engine.py)        (explanation.py)
```

### 1. Requirement extraction — `backend/app/expert_system/nlp.py`
Pattern and dictionary based, **no external AI API required**. Matches appliance synonyms
("fridge" → Refrigerator, "AC" → Air conditioner, "telly"/"TV" → LED television), numeric and
word quantities ("4 fans", "five lights"), backup durations ("8 hours of backup",
"backup for around 6 hours"), bedroom counts and peak sun hours. Wattages come from the
`appliances` database table, not hardcoded values.

### 2. Engineering calculations — `calculations.py`
Transparent, unit-labelled, division-by-zero guarded:

| Quantity | Formula |
| --- | --- |
| Connected load | Σ (quantity × wattage) |
| Daily energy | Σ (quantity × wattage × hours/day) |
| Essential load | Σ of appliances marked `is_essential` |
| Inverter capacity | connected load × (1 + safety margin), rounded up to a catalogue size |
| PV array | daily Wh ÷ (peak sun hours × performance ratio) × (1 + reserve), rounded to whole modules |
| Battery nominal energy | essential W × backup h ÷ (depth of discharge × efficiency) |
| Battery capacity (Ah) | nominal Wh ÷ battery voltage |
| Backup duration | nominal Wh × DoD × efficiency ÷ essential load |

### 3. Inference engine — `inference_engine.py`
Database-driven. Rules live in the `expert_rules` table and are evaluated in **priority order**
against a fact dictionary (`total_load_w`, `backup_hours_target`, `has_motor_load`, …).
Supported operators: `lt`, `lte`, `gt`, `gte`, `eq`, `neq`, `between`. Every run records which
rules fired, their condition detail and a formatted explanation, and stores the full trace in
`inference_traces`. Seeded rules include `NLP-001`, `INV-001/002/003`, `PV-004/006`,
`BAT-003/007`, `SUR-005`, `ESS-008`.

### 4. Explanation facility — `explanation.py`
Returns the per-component reasoning lines plus a human-readable assumptions block that is stored
with every saved recommendation.

### Missing information
The advisor **asks instead of guessing**. If appliances are found but no backup duration is
stated, it asks how many hours of backup are required and does not run a sizing pass until the
user answers. Approximate values are labelled as estimates throughout the UI.

---

## Pages

### General user
| Page | Purpose |
| --- | --- |
| Chat Advisor | Conversational consultation, clarification questions, live energy brief, loading state, clear chat |
| My Recommendations | Saved reports, delete with confirmation |
| Recommendation report | Sizing cards, applied rules, load chart + appliance table, assumptions, print/PDF |
| Knowledge Base | Read-only browsing of published facts with category filter and search |
| How It Works / FAQs | Explains the pipeline, formulas and limitations |
| Contact | Stores a support message in the database |
| Account settings | Name, location, preferences, role display |

### Administrator / Solar expert
| Page | Purpose |
| --- | --- |
| Dashboard | Live statistics, consultation sizing chart, recent reports and inference runs |
| Knowledge management | Knowledge-fact CRUD **and** appliance catalogue CRUD |
| Rule management | IF-THEN rule CRUD, enable/disable, priority, operators, explanation templates |
| Equipment database | Solar panel, inverter and battery CRUD with type-specific schemas |
| Test expert rules | Sandbox that shows extraction, calculations and the full 11-step trace |
| Inference traces | Historical run viewer: facts, fired rules, every evaluated condition |
| User management | Search/filter users, change role and status, invite users, delete |
| System settings | Engineering defaults (PSU, PR, DoD, efficiency, margins) applied to new consultations |

---

## API overview

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | public |
| POST | `/api/auth/logout` | public (clears the session cookie) |
| GET/PATCH | `/api/auth/me` | authenticated |
| POST | `/api/chat` | user + admin |
| GET/DELETE | `/api/chat/history` | authenticated (own data) |
| GET/DELETE | `/api/recommendations`, `/api/recommendations/:id` | owner only |
| GET | `/api/knowledge`, `/api/appliances`, `/api/equipment`, `/api/rules`, `/api/settings` | authenticated, read-only |
| POST | `/api/contact` | authenticated |
| ALL | `/api/admin/knowledge`, `/api/admin/appliances`, `/api/admin/rules`, `/api/admin/equipment/:kind` | **admin only** |
| POST | `/api/admin/test-rules` | admin only |
| GET | `/api/admin/stats`, `/api/admin/traces`, `/api/admin/users` | admin only |
| PATCH/DELETE | `/api/admin/users/:id`, `/api/admin/settings` | admin only |
| GET | `/api/health` | public |

**Security:** passwords are hashed with Werkzeug PBKDF2; sessions use HMAC-SHA256 signed tokens
(sent both as a `Bearer` token and an `HttpOnly` session cookie, so the session survives
proxies or embedded previews that strip custom headers or block Web Storage);
`require_admin` returns HTTP 403 server-side for every general-user request to an admin endpoint,
regardless of what the UI shows. Users can only read and delete their own recommendations
(the query is scoped by `user_id`), and cannot change their own role or delete their own account.

---

## Database schema

`users`, `appliances`, `knowledge_facts`, `expert_rules`, `solar_panels`, `inverters`, `batteries`,
`recommendations`, `recommendation_appliances`, `inference_traces`
(plus `chat_messages`, `contact_messages`, `system_settings` for conversation history, support
messages and configurable defaults). All tables use primary keys, foreign keys with
`ON DELETE CASCADE`/`SET NULL`, CHECK constraints and timestamps. Created and seeded by
`backend/app/database.py` on first run.

---

## Tests

```bash
cd backend
python -m pytest tests -q
```

27 tests across `test_calculations.py`, `test_nlp.py`, `test_rules.py`, `test_api.py`,
`test_recommendation.py` and `test_workflow.py` cover: engineering formulas and division-by-zero
guards, requirement extraction (including word-number quantities and missing-data cases),
rule evaluation and priorities, clarification handling, authentication, RBAC (403 for general
users), recommendation generation/persistence, and the **complete end-to-end workflow**.

---

## Project structure

```
Solar-Advisor/
├── backend/
│   ├── app/
│   │   ├── __init__.py            # create_app factory
│   │   ├── auth.py                # token signing, RBAC decorators
│   │   ├── database.py            # schema, seed data, settings helpers
│   │   ├── routes/api.py          # all REST endpoints
│   │   └── expert_system/
│   │       ├── nlp.py             # pattern/dictionary extraction
│   │       ├── calculations.py    # transparent sizing formulas
│   │       ├── inference_engine.py# IF-THEN evaluation + trace
│   │       ├── explanation.py     # explanation facility
│   │       └── knowledge_base.py  # DB access helpers
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/ui.jsx      # modals, badges, form primitives
│   │   ├── hooks/useAuth.jsx
│   │   ├── layouts/MainLayout.jsx # navy sidebar + top bar + mobile drawer
│   │   ├── pages/                 # user pages + pages/admin/
│   │   ├── services/api.js
│   │   ├── App.jsx / main.jsx
│   │   └── index.css
│   ├── tailwind.config.js         # design tokens (navy/blue palette, Inter, 12px corners)
│   └── package.json
├── docs/COMPLETED_FEATURES.md
└── README.md
```

---

## Completed features & known limitations

See [`docs/COMPLETED_FEATURES.md`](docs/COMPLETED_FEATURES.md) for the full checklist and the
documented limitations (summary: no real email delivery for support messages or PDF export —
both use clearly-labelled in-app/print equivalents; appliance run hours fall back to database
typical values when the user does not state them, and are labelled as estimates).

---

## Disclaimer

Sizing produced by this tool is **preliminary planning information, not certified installation
design**. Final engineering requires verified appliance ratings, start-up surge measurements,
roof shading and irradiance data, and compliance with local electrical standards. A qualified
installer must verify protection devices, cable sizing, earthing and inverter/battery
compatibility before any installation.
