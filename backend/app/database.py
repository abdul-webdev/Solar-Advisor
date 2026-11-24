"""SQLite database layer: schema, connection helpers, seeding."""
import os
import sqlite3
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# SOLAR_DB_PATH lets a deployment point the database at a mounted disk
# (e.g. Render's /var/data). Defaults to the backend folder for local use.
DB_PATH = os.environ.get("SOLAR_DB_PATH", os.path.join(BASE_DIR, "solar_advisor.db"))
_db_dir = os.path.dirname(os.path.abspath(DB_PATH))
if _db_dir and not os.path.isdir(_db_dir):
    os.makedirs(_db_dir, exist_ok=True)

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','invited')),
    location TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_active TEXT
);

CREATE TABLE IF NOT EXISTS appliances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'general',
    wattage_w REAL NOT NULL CHECK (wattage_w > 0),
    typical_hours_per_day REAL NOT NULL DEFAULT 4,
    is_essential INTEGER NOT NULL DEFAULT 1,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT NOT NULL DEFAULT '',
    value_text TEXT DEFAULT '',
    source TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    priority INTEGER NOT NULL DEFAULT 100,
    condition_field TEXT NOT NULL,
    operator TEXT NOT NULL DEFAULT 'gte',
    threshold_value REAL NOT NULL DEFAULT 0,
    threshold_value2 REAL,
    action_type TEXT NOT NULL DEFAULT 'note',
    action_value TEXT DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    explanation_template TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS solar_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    wattage_w REAL NOT NULL CHECK (wattage_w > 0),
    efficiency_pct REAL DEFAULT 21.5,
    max_power_voltage_v REAL DEFAULT 41.95,
    status TEXT NOT NULL DEFAULT 'verified',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inverters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    capacity_kw REAL NOT NULL CHECK (capacity_kw > 0),
    dc_voltage_v REAL DEFAULT 48,
    ac_voltage_v REAL DEFAULT 230,
    surge_kw REAL DEFAULT 0,
    efficiency_pct REAL DEFAULT 93,
    status TEXT NOT NULL DEFAULT 'verified',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS batteries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    technology TEXT DEFAULT 'Lithium iron phosphate (LiFePO4)',
    nominal_voltage_v REAL NOT NULL CHECK (nominal_voltage_v > 0),
    capacity_ah REAL NOT NULL CHECK (capacity_ah > 0),
    depth_of_discharge_pct REAL DEFAULT 80,
    efficiency_pct REAL DEFAULT 95,
    cycle_life INTEGER DEFAULT 6000,
    status TEXT NOT NULL DEFAULT 'verified',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    household_context TEXT DEFAULT '',
    total_load_w REAL NOT NULL DEFAULT 0,
    daily_energy_wh REAL NOT NULL DEFAULT 0,
    essential_load_w REAL NOT NULL DEFAULT 0,
    backup_hours_target REAL NOT NULL DEFAULT 0,
    inverter_capacity_kw REAL NOT NULL DEFAULT 0,
    pv_capacity_wp REAL NOT NULL DEFAULT 0,
    pv_panel_count INTEGER NOT NULL DEFAULT 0,
    pv_panel_wattage_w REAL NOT NULL DEFAULT 0,
    battery_voltage_v REAL NOT NULL DEFAULT 0,
    battery_capacity_ah REAL NOT NULL DEFAULT 0,
    battery_energy_wh REAL NOT NULL DEFAULT 0,
    estimated_backup_hours REAL NOT NULL DEFAULT 0,
    assumptions_json TEXT DEFAULT '{}',
    triggered_rules_json TEXT DEFAULT '[]',
    explanation TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendation_appliances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    appliance_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    wattage_w REAL NOT NULL DEFAULT 0,
    hours_per_day REAL NOT NULL DEFAULT 0,
    total_w REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inference_traces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id INTEGER REFERENCES recommendations(id) ON DELETE SET NULL,
    run_type TEXT NOT NULL DEFAULT 'recommendation',
    input_text TEXT DEFAULT '',
    facts_json TEXT DEFAULT '{}',
    trace_json TEXT DEFAULT '[]',
    triggered_rules_json TEXT DEFAULT '[]',
    duration_ms INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

DEFAULT_SETTINGS = {
    "peak_sun_hours": "4.0",
    "pv_performance_ratio": "0.80",
    "battery_dod": "0.80",
    "inverter_efficiency": "0.90",
    "inverter_safety_margin": "0.25",
    "solar_array_reserve": "0.20",
    "battery_voltage": "51.2",
    "allow_registration": "true",
    "knowledge_version": "v2.4",
    "rules_version": "v1.8",
    "nlp_version": "v1.6",
}

APPLIANCES_SEED = [
    ("Ceiling fan", "cooling", 75, 12, 1, "Typical ceiling fan nameplate."),
    ("LED light", "lighting", 9, 8, 1, "LED bulb / tube equivalent."),
    ("Refrigerator", "kitchen", 200, 12, 1, "Domestic refrigerator, duty-cycle adjusted hours."),
    ("LED television", "entertainment", 100, 4, 1, "LED TV."),
    ("Washing machine", "laundry", 1440, 1, 0, "Washer with heater element; non-essential during outages."),
    ("Air conditioner", "cooling", 1500, 6, 0, "Split AC, inverter type estimate."),
    ("Microwave oven", "kitchen", 1200, 0.5, 0, "Microwave."),
    ("Electric kettle", "kitchen", 1500, 0.5, 0, "Electric kettle."),
    ("Electric iron", "laundry", 1000, 0.5, 0, "Steam iron."),
    ("Water pump", "utility", 750, 1, 1, "Domestic water pump."),
    ("Computer", "electronics", 200, 6, 1, "Desktop computer."),
    ("Router / Wi-Fi", "electronics", 20, 24, 1, "Router and modem."),
    ("Water heater", "utility", 2000, 1, 0, "Electric water heater."),
    ("Clothes dryer", "laundry", 2500, 1, 0, "Electric tumble dryer."),
    ("Electric oven", "kitchen", 2000, 1, 0, "Electric oven."),
    ("Lighting (general)", "lighting", 15, 8, 1, "General lighting point."),
    ("Fan (standing)", "cooling", 60, 10, 1, "Standing fan."),
    ("Freezer", "kitchen", 250, 12, 1, "Chest freezer."),
    ("Rice cooker", "kitchen", 700, 1, 0, "Rice cooker."),
    ("Hair dryer", "personal", 1200, 0.25, 0, "Hair dryer."),
]

KNOWLEDGE_SEED = [
    ("KB-BAT-012", "Lithium Iron Phosphate Battery", "Battery Technology",
     "LiFePO4 batteries provide high cycle life, good thermal stability and efficient energy storage.",
     "51.2 V nominal · 280 Ah · 80% DoD planning limit", "Manufacturer datasheet · LF280K specification, revision C"),
    ("KB-PV-001", "Peak Sun Hours", "Solar Fundamentals",
     "Peak sun hours (PSH) convert solar irradiance into equivalent full-sun hours per day. A value of 4.0 PSH is a conservative educational default.",
     "Default: 4.0 hours/day", "PV sizing textbook, Ch. 3"),
    ("KB-PV-002", "PV Performance Ratio", "Solar Fundamentals",
     "The performance ratio accounts for inverter, wiring, temperature and soiling losses between the array and the load.",
     "Default: 80%", "IEC 61853 guidance"),
    ("KB-INV-001", "Inverter Safety Margin", "Inverter Sizing",
     "Continuous inverter capacity should exceed simultaneous load by a safety margin to cover motor starting and short-term peaks.",
     "Default margin: 25%", "Manufacturer sizing guide"),
    ("KB-BAT-001", "Depth of Discharge", "Battery Technology",
     "Usable battery energy is limited by depth of discharge. Planning at 80% DoD protects cycle life for LiFePO4 chemistries.",
     "Default: 80%", "Battery datasheet"),
    ("KB-SUR-001", "Motor Starting Surge", "Safety",
     "Refrigerators, pumps and washing machines draw 3-5x running current at start-up. Verify inverter surge rating before installation.",
     "Check surge rating vs. motor loads", "Electrical safety note"),
    ("KB-ESS-001", "Essential vs Non-Essential Loads", "System Design",
     "Backup sizing should prioritise essential loads (lighting, fridge, fans, communications). Heavy heating/laundry loads are typically excluded during outages.",
     "Essential list defined in appliance table", "Expert consensus"),
    ("KB-VOLT-001", "Battery Voltage Selection", "System Design",
     "48 V nominal systems (51.2 V LiFePO4) are preferred for loads above ~1 kW because they reduce DC current and cable losses.",
     "51.2 V for >1 kW loads", "System design guide"),
    ("KB-ENERGY-001", "Daily Energy Formula", "Calculations",
     "Daily energy = sum of (quantity × wattage × hours per day) for every appliance. All sizing flows from this figure.",
     "Wh/day", "Engineering reference"),
    ("KB-INSTALL-001", "Installation Disclaimer", "Safety",
     "This advisor provides preliminary educational sizing only. Final design requires site survey, verified nameplates, protection devices and local standards compliance.",
     "Not certified installation advice", "Regulatory note"),
    ("KB-PANEL-001", "Module Rounding", "Solar Fundamentals",
     "PV capacity is rounded up to whole modules. Array wattage = panel count × module wattage.",
     "Round up to next module", "Design practice"),
    ("KB-BACKUP-001", "Backup Duration Estimate", "Calculations",
     "Estimated backup hours = usable battery energy ÷ essential load. Connected load is not the same as average demand.",
     "Hours = usable Wh / essential W", "Engineering reference"),
]

RULES_SEED = [
    ("NLP-001", "Requirements extracted", "extraction", 10, "appliance_count", "gte", 1, None,
     "note", "facts_ready", "At least one appliance was extracted from the user's description.",
     "Extracted {appliance_count} appliance categories."),
    ("INV-001", "Small-load inverter band", "inverter", 20, "total_load_w", "lt", 1000, None,
     "recommend_inverter", "1 kVA to 1.5 kVA", "IF total load is below 1000 W THEN consider a 1-1.5 kVA inverter.",
     "Connected load {total_load_w} W is in the small-load band."),
    ("INV-002", "Inverter continuous-load margin", "inverter", 30, "total_load_w", "gte", 0, None,
     "recommend_inverter", "load x 1.25", "IF total load is known THEN apply 25% safety margin and select the next standard inverter size.",
     "{total_load_w} W × 1.25 = {required_inverter_w} W → select {inverter_capacity_kw} kW inverter."),
    ("INV-003", "Large-load inverter band", "inverter", 25, "total_load_w", "gte", 3000, None,
     "recommend_inverter", "5 kVA+", "IF total load is 3000 W or more THEN consider a 5 kVA or larger inverter and review load shedding.",
     "Large connected load {total_load_w} W — review essential-load strategy."),
    ("PV-004", "Solar array sizing", "solar", 40, "daily_energy_wh", "gt", 0, None,
     "recommend_pv", "daily/(PSH x PR)", "IF daily energy is known THEN PV capacity = daily energy / (peak sun hours × performance ratio), plus reserve.",
     "{daily_energy_wh} Wh ÷ ({peak_sun_hours} PSH × {pv_ratio}) = {pv_required_wp} Wp → {pv_capacity_wp} Wp array."),
    ("PV-006", "Round to whole modules", "solar", 45, "pv_required_wp", "gt", 0, None,
     "recommend_pv", "ceil to modules", "IF PV capacity is computed THEN round up to whole modules from the equipment database.",
     "{pv_required_wp} Wp target → {pv_panel_count} × {pv_panel_wattage_w} W = {pv_capacity_wp} Wp."),
    ("BAT-003", "Usable battery capacity", "battery", 50, "backup_hours_target", "gt", 0, None,
     "recommend_battery", "essential x hours / (DoD x eff)", "IF backup hours are required THEN battery nominal energy = essential load × hours / (DoD × efficiency).",
     "{essential_load_w} W × {backup_hours_target} h ÷ ({dod} × {inv_eff}) = {battery_required_wh} Wh nominal."),
    ("BAT-007", "Long backup increases storage", "battery", 55, "backup_hours_target", "gte", 8, None,
     "recommend_battery", "larger bank", "IF required backup is 8 hours or more THEN prefer a larger standard battery bank for resilience.",
     "Backup target {backup_hours_target} h requires a larger storage bank."),
    ("SUR-005", "Start-surge compatibility check", "safety", 60, "has_motor_load", "eq", 1, None,
     "check_surge", "verify surge", "IF motor loads (fridge/pump/washer) are present THEN verify inverter surge rating covers start-up current.",
     "Motor loads present — verify inverter surge rating before installation."),
    ("ESS-008", "Essential-load backup strategy", "design", 65, "essential_load_w", "gt", 0, None,
     "note", "essential_only", "IF essential loads are identified THEN size backup on essential load and exclude heavy non-essential loads.",
     "Backup sized on essential load {essential_load_w} W; non-essential loads excluded during outages."),
    ("WARN-009", "Missing backup target warning", "design", 5, "backup_hours_target", "eq", 0, None,
     "warn", "ask_user", "IF backup duration is missing THEN ask the user instead of guessing.",
     "Backup duration not provided — clarification required."),
]

PANELS_SEED = [
    ("LONGi Solar", "Hi-MO 6 LR5-72HTH", 550, 21.5, 41.95),
    ("JA Solar", "JAM72D30 550W", 550, 21.3, 41.6),
    ("Canadian Solar", "HiKu6 CS6R-550MS", 550, 21.1, 41.9),
    ("Trina Solar", "Vertex S+ TSM-NEG9R.28", 450, 22.0, 41.2),
    ("SunPower", "Maxeon 3 400W", 400, 22.8, 65.8),
]

INVERTERS_SEED = [
    ("Growatt", "SPF 1000ES", 1.0, 24, 230, 2.0, 93),
    ("Growatt", "SPF 1500ES", 1.5, 24, 230, 3.0, 93),
    ("Deye", "SUN-2K-SG05LP1", 2.0, 48, 230, 4.0, 97),
    ("Growatt", "SPF 3000ES", 3.0, 48, 230, 6.0, 93),
    ("Deye", "SUN-5K-SG05LP1", 5.0, 48, 230, 10.0, 97),
    ("Growatt", "SPF 7500ES", 7.5, 48, 230, 15.0, 93),
    ("Victron Energy", "MultiPlus 10kVA", 10.0, 48, 230, 20.0, 94),
]

BATTERIES_SEED = [
    ("EVE Energy", "LF280K · 16S storage bank", "Lithium iron phosphate (LiFePO4)", 51.2, 280, 80, 95, 6000),
    ("Pylontech", "US2000C", "Lithium iron phosphate (LiFePO4)", 51.2, 200, 80, 95, 6000),
    ("Pylontech", "US3000C", "Lithium iron phosphate (LiFePO4)", 51.2, 150, 80, 95, 6000),
    ("Growatt", "ARK-5.1L", "Lithium iron phosphate (LiFePO4)", 51.2, 100, 80, 95, 6000),
    ("Generic", "12V 100Ah AGM", "Sealed lead-acid (AGM)", 12.8, 100, 50, 85, 1200),
    ("Generic", "24V 100Ah LiFePO4", "Lithium iron phosphate (LiFePO4)", 25.6, 100, 80, 95, 6000),
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)
    for k, v in DEFAULT_SETTINGS.items():
        conn.execute("INSERT OR IGNORE INTO system_settings(key, value) VALUES (?, ?)", (k, v))
    conn.commit()
    conn.close()


def get_settings():
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM system_settings").fetchall()
    conn.close()
    out = dict(DEFAULT_SETTINGS)
    out.update({r["key"]: r["value"] for r in rows})
    return out


def set_setting(key, value):
    conn = get_db()
    conn.execute(
        "INSERT INTO system_settings(key, value, updated_at) VALUES (?, ?, datetime('now')) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')",
        (key, str(value)),
    )
    conn.commit()
    conn.close()


def seed():
    from werkzeug.security import generate_password_hash

    init_db()
    conn = get_db()
    # Users (demo accounts)
    users = [
        ("Alex Morgan", "user@example.com", "User@12345", "user", "active", "Lagos, Nigeria"),
        ("Dr. Sarah Chen", "admin@solaradvisor.com", "Admin@12345", "admin", "active", "Solar expert · Administrator"),
        ("Daniel Okafor", "daniel.o@email.com", "User@12345", "user", "active", ""),
        ("Eng. Priya Shah", "priya.shah@solaradvisor.io", "User@12345", "admin", "active", "Solar expert"),
        ("Maria Santos", "maria.s@email.com", "User@12345", "user", "suspended", ""),
        ("James Wilson", "james.w@email.com", "User@12345", "user", "invited", ""),
    ]
    for name, email, pw, role, status, loc in users:
        conn.execute(
            "INSERT OR IGNORE INTO users(name, email, password_hash, role, status, location) VALUES (?,?,?,?,?,?)",
            (name, email, generate_password_hash(pw), role, status, loc),
        )
    for row in APPLIANCES_SEED:
        conn.execute(
            "INSERT OR IGNORE INTO appliances(name, category, wattage_w, typical_hours_per_day, is_essential, description) VALUES (?,?,?,?,?,?)",
            row,
        )
    for row in KNOWLEDGE_SEED:
        conn.execute(
            "INSERT OR IGNORE INTO knowledge_facts(fact_code, title, category, description, value_text, source) VALUES (?,?,?,?,?,?)",
            row,
        )
    for row in RULES_SEED:
        conn.execute(
            "INSERT OR IGNORE INTO expert_rules(rule_code, name, category, priority, condition_field, operator, threshold_value, threshold_value2, action_type, action_value, description, explanation_template) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            row,
        )
    for row in PANELS_SEED:
        conn.execute(
            "INSERT OR IGNORE INTO solar_panels(manufacturer, model, wattage_w, efficiency_pct, max_power_voltage_v) VALUES (?,?,?,?,?)",
            row,
        )
    for row in INVERTERS_SEED:
        conn.execute(
            "INSERT OR IGNORE INTO inverters(manufacturer, model, capacity_kw, dc_voltage_v, ac_voltage_v, surge_kw, efficiency_pct) VALUES (?,?,?,?,?,?,?)",
            row,
        )
    for row in BATTERIES_SEED:
        conn.execute(
            "INSERT OR IGNORE INTO batteries(manufacturer, model, technology, nominal_voltage_v, capacity_ah, depth_of_discharge_pct, efficiency_pct, cycle_life) VALUES (?,?,?,?,?,?,?,?)",
            row,
        )
    conn.commit()
    conn.close()
    print("Seed complete. Demo logins: user@example.com / User@12345 · admin@solaradvisor.com / Admin@12345")


def now_iso():
    return datetime.now(timezone.utc).isoformat()
