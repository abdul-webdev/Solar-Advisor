"""All REST API routes: auth, chat, recommendations, KB, rules, equipment, admin."""
import json
import re
import uuid
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from werkzeug.security import generate_password_hash

from app.auth import (TOKEN_COOKIE, check_credentials, current_user, make_token,
                      require_admin, require_auth)
from app.database import get_db, get_settings, set_setting
from app.expert_system import calculations, explanation, inference_engine, knowledge_base, nlp

bp = Blueprint("api", __name__)


def _row_to_dict(row):
    return dict(row) if row else None


def _auth_response(user, status=200):
    """Issue a token in the body AND as an HttpOnly-free session cookie.

    The cookie is the fallback path for embedded/proxied environments that drop
    custom headers; the body token is what the SPA normally uses.
    """
    token = make_token(user)
    resp = jsonify({"token": token, "user": _public_user(user)})
    resp.status_code = status
    resp.set_cookie(TOKEN_COOKIE, token, httponly=True, samesite="Lax", max_age=60 * 60 * 24 * 7, path="/")
    return resp


def _public_user(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"],
            "status": u["status"], "location": u.get("location", ""), "created_at": u.get("created_at", "")}


# ---------------- Auth ----------------
@bp.post("/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required."}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    settings = get_settings()
    if settings.get("allow_registration") != "true":
        return jsonify({"error": "Public registration is currently disabled."}), 403
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "An account with this email already exists."}), 409
    cur = conn.execute(
        "INSERT INTO users(name, email, password_hash, role, status) VALUES (?,?,?,?, 'active')",
        (name, email, generate_password_hash(password), "user"),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return _auth_response(dict(row), status=201)


@bp.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = check_credentials(email, password)
    if not user:
        return jsonify({"error": "Invalid email or password."}), 401
    conn = get_db()
    conn.execute("UPDATE users SET last_active = datetime('now') WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()
    return _auth_response(user)


@bp.post("/auth/logout")
def logout():
    resp = jsonify({"ok": True})
    resp.delete_cookie(TOKEN_COOKIE, path="/")
    return resp


@bp.get("/auth/me")
@require_auth
def me():
    return jsonify({"user": _public_user(g.user)})


@bp.patch("/auth/me")
@require_auth
def update_me():
    data = request.get_json(silent=True) or {}
    conn = get_db()
    name = (data.get("name") or g.user["name"]).strip()
    location = data.get("location", g.user.get("location", ""))
    conn.execute("UPDATE users SET name = ?, location = ? WHERE id = ?", (name, location, g.user["id"]))
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    conn.close()
    return jsonify({"user": _public_user(dict(row))})


# ---------------- Chat / Expert system ----------------
def _generate_recommendation(extraction, user_id=None):
    catalog = knowledge_base.get_appliance_catalog()
    equipment = knowledge_base.get_equipment()
    settings = get_settings()
    if extraction.get("peak_sun_hours"):
        settings = dict(settings)
        settings["peak_sun_hours"] = str(extraction["peak_sun_hours"])
    calc = calculations.run_all_calculations(
        extraction["appliances"], extraction["backup_hours"] or 0, settings,
        equipment["inverters"], equipment["batteries"], equipment["panels"],
    )
    facts = inference_engine.build_facts(extraction, calc)
    rules = knowledge_base.get_rules()
    triggered, trace, duration_ms = inference_engine.evaluate_rules(facts, rules)
    expl = explanation.build_explanation(calc, triggered, trace, extraction)
    assumptions = explanation.build_assumptions_text(calc, extraction)
    reference = "SA-2025-" + uuid.uuid4().hex[:4].upper()
    rec = {
        "reference": reference,
        "household_context": extraction.get("household_context", ""),
        "appliances": extraction["appliances"],
        "total_load_w": calc["total_load_w"],
        "daily_energy_wh": calc["daily_energy_wh"],
        "daily_energy_kwh": calc["daily_energy_kwh"],
        "essential_load_w": calc["essential_load_w"],
        "backup_hours_target": extraction.get("backup_hours") or 0,
        "inverter_capacity_kw": calc["inverter_capacity_kw"],
        "required_inverter_w": calc["required_inverter_w"],
        "pv_capacity_wp": calc["pv_capacity_wp"],
        "pv_required_wp": calc["pv_required_wp"],
        "pv_panel_count": calc["pv_panel_count"],
        "pv_panel_wattage_w": calc["pv_panel_wattage_w"],
        "pv_panel_model": calc["pv_panel_model"],
        "battery_voltage_v": calc["battery_voltage_v"],
        "battery_capacity_ah": calc["battery_capacity_ah"],
        "battery_energy_wh": calc["battery_energy_wh"],
        "battery_model": calc["battery_model"],
        "usable_energy_wh": calc["usable_energy_wh"],
        "estimated_backup_hours": calc["estimated_backup_hours"],
        "backup_at_1kw_hours": calc["backup_at_1kw_hours"],
        "assumptions": assumptions,
        "assumptions_detail": calc["assumptions"],
        "triggered_rules": triggered,
        "explanation": expl,
        "trace": trace,
        "duration_ms": duration_ms,
        "facts": facts,
    }
    return rec


def _save_recommendation(rec, user_id):
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO recommendations(reference, user_id, household_context, total_load_w, daily_energy_wh,
           essential_load_w, backup_hours_target, inverter_capacity_kw, pv_capacity_wp, pv_panel_count,
           pv_panel_wattage_w, battery_voltage_v, battery_capacity_ah, battery_energy_wh,
           estimated_backup_hours, assumptions_json, triggered_rules_json, explanation)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (rec["reference"], user_id, rec["household_context"], rec["total_load_w"], rec["daily_energy_wh"],
         rec["essential_load_w"], rec["backup_hours_target"], rec["inverter_capacity_kw"], rec["pv_capacity_wp"],
         rec["pv_panel_count"], rec["pv_panel_wattage_w"], rec["battery_voltage_v"], rec["battery_capacity_ah"],
         rec["battery_energy_wh"], rec["estimated_backup_hours"], json.dumps(rec["assumptions"]),
         json.dumps(rec["triggered_rules"]), rec["explanation"]),
    )
    rec_id = cur.lastrowid
    for a in rec["appliances"]:
        conn.execute(
            "INSERT INTO recommendation_appliances(recommendation_id, appliance_name, quantity, wattage_w, hours_per_day, total_w) VALUES (?,?,?,?,?,?)",
            (rec_id, a["name"], a["quantity"], a["wattage_w"], a["hours_per_day"],
             a["quantity"] * a["wattage_w"]),
        )
    conn.execute(
        "INSERT INTO inference_traces(recommendation_id, run_type, input_text, facts_json, trace_json, triggered_rules_json, duration_ms) VALUES (?,?,?,?,?,?,?)",
        (rec_id, "recommendation", rec.get("input_text", ""), json.dumps(rec["facts"]),
         json.dumps(rec["trace"]), json.dumps(rec["triggered_rules"]), rec["duration_ms"]),
    )
    conn.commit()
    conn.close()
    rec["id"] = rec_id
    return rec


@bp.post("/chat")
@require_auth
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history") or []
    if not message:
        return jsonify({"error": "Please type a message describing your electricity needs."}), 400

    catalog = knowledge_base.get_appliance_catalog()
    # Merge extraction across the whole conversation so clarification answers accumulate.
    merged_appliances = []
    backup_hours = None
    bedrooms = None
    context = ""
    for item in history:
        if item.get("role") == "user" and item.get("content"):
            ext = nlp.extract_requirements(item["content"], catalog)
            merged_appliances = nlp.merge_extractions(merged_appliances, ext["appliances"])
            backup_hours = ext["backup_hours"] if ext["backup_hours"] else backup_hours
            bedrooms = ext["bedrooms"] or bedrooms
            context = ext["household_context"] or context
    ext = nlp.extract_requirements(message, catalog)
    merged_appliances = nlp.merge_extractions(merged_appliances, ext["appliances"])
    backup_hours = ext["backup_hours"] if ext["backup_hours"] else backup_hours
    bedrooms = ext["bedrooms"] or bedrooms
    context = ext["household_context"] or context

    intent = nlp.detect_intent(message)
    conn = get_db()
    conn.execute("INSERT INTO chat_messages(user_id, role, content) VALUES (?,?,?)", (g.user["id"], "user", message))
    conn.commit()
    conn.close()

    def reply(content, rec=None, questions=None, brief=None):
        conn2 = get_db()
        conn2.execute("INSERT INTO chat_messages(user_id, role, content) VALUES (?,?,?)", (g.user["id"], "assistant", content))
        conn2.commit()
        conn2.close()
        return jsonify({"reply": content, "recommendation": rec, "questions": questions or [], "brief": brief})

    if intent == "greeting":
        return reply("Hello! I'm the Solar Advisor. Describe your household appliances and how many hours of backup you need — for example: \"I have 4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine. I need 8 hours of backup.\"")
    if intent == "thanks":
        return reply("You're welcome! If you'd like, describe another home or ask me to explain any component (inverter, panels or battery) in more detail.")

    # Conceptual questions: answer from the knowledge base (no sizing run needed).
    if intent in ("battery", "panel", "inverter", "explain") and not merged_appliances:
        low = message.lower()
        topic = intent
        if topic == "explain":
            for kw, name in (("panel", "panel"), ("pv", "panel"), ("solar array", "panel"),
                             ("battery", "battery"), ("storage", "battery"),
                             ("inverter", "inverter")):
                if kw in low:
                    topic = name
                    break
        intent = topic
        rec_row = None
        conn = get_db()
        rec_row = conn.execute(
            "SELECT * FROM recommendations WHERE user_id = ? ORDER BY id DESC LIMIT 1", (g.user["id"],)
        ).fetchone()
        conn.close()
        facts = knowledge_base.list_facts(search={"battery": "Battery", "panel": "Solar",
                                                  "inverter": "Inverter"}.get(intent, "Battery"))
        detail = facts[0]["description"] if facts else ""
        if intent == "battery":
            base = ("The battery bank stores energy for outages. I size it from your essential load and backup hours: "
                    "nominal energy = essential W × backup h ÷ (depth of discharge × inverter efficiency).")
        elif intent == "panel":
            base = ("The PV array recharges the battery and runs daytime loads. I size it from your daily energy: "
                    "PV Wp = daily Wh ÷ (peak sun hours × performance ratio), plus a 20% reserve, then round up to whole modules.")
        elif intent == "inverter":
            base = ("The inverter converts DC to AC and must carry your simultaneous load plus a 25% engineering margin, "
                    "with enough surge rating for motor start-up.")
        else:
            base = ("Every number I give you comes from three layers: pattern-based extraction of your appliances, "
                    "documented engineering formulas, and database IF-THEN rules evaluated in priority order. "
                    "Each rule that fires is listed in your report with its reasoning.")
        tail = ""
        if rec_row:
            r = dict(rec_row)
            if intent == "battery":
                tail = (f" For your last consultation ({r['reference']}): {r['battery_energy_wh']/1000:.2f} kWh nominal "
                        f"at {r['battery_voltage_v']:g} V / {r['battery_capacity_ah']:g} Ah, which gives about "
                        f"{r['estimated_backup_hours']:g} hours on {r['essential_load_w']:.0f} W of essential load.")
            elif intent == "panel":
                tail = (f" For {r['reference']}: {r['pv_capacity_wp']:,.0f} Wp — {r['pv_panel_count']} × "
                        f"{r['pv_panel_wattage_w']:g} W modules against {r['daily_energy_wh']/1000:.2f} kWh/day.")
            elif intent == "inverter":
                tail = (f" For {r['reference']}: {r['inverter_capacity_kw']:g} kW continuous, sized from "
                        f"{r['total_load_w']:,.0f} W connected load × 1.25 margin.")
            else:
                tail = f" Your latest report ({r['reference']}) lists every applied rule under “Sizing calculations & applied rules”."
        return reply(base + ((" " + detail) if detail and intent != "explain" else "") + tail)

    if not merged_appliances:
        return reply(
            "I couldn't identify any appliances in that message. Please list what you use — for example: \"4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine.\" "
            "You can also tell me how many hours of backup you need.",
            questions=["Which appliances do you use, and how many of each?"],
        )

    brief = {
        "appliances": merged_appliances,
        "total_load_w": sum(a["quantity"] * a["wattage_w"] for a in merged_appliances),
        "backup_hours": backup_hours,
        "household_context": context,
    }

    if backup_hours is None:
        names = ", ".join(f"{a['quantity']} × {a['name']}" for a in merged_appliances)
        return reply(
            f"Thanks — I've noted: {names}. Before I size the system, how many hours of backup do you need during a power outage? "
            "For example, reply \"8 hours of backup\". I won't guess this value.",
            questions=["How many hours of backup do you need?"],
            brief=brief,
        )

    extraction = {"appliances": merged_appliances, "backup_hours": backup_hours,
                  "bedrooms": bedrooms, "household_context": context,
                  "peak_sun_hours": ext.get("peak_sun_hours")}
    rec = _generate_recommendation(extraction, g.user["id"])
    rec["input_text"] = message
    rec = _save_recommendation(rec, g.user["id"])
    met = "meets" if rec["estimated_backup_hours"] >= backup_hours else "is close to"
    text = (
        f"Thank you! I've analyzed your appliance requirements and calculated a suitable solar configuration. "
        f"Your connected load is {rec['total_load_w']:,.0f} W with estimated daily energy of {rec['daily_energy_kwh']:.2f} kWh. "
        f"I recommend a {rec['inverter_capacity_kw']:g} kW inverter, a {rec['pv_capacity_wp']:,.0f} Wp solar array "
        f"({rec['pv_panel_count']} × {rec['pv_panel_wattage_w']:g} W panels) and a {rec['battery_voltage_v']:g} V / "
        f"{rec['battery_capacity_ah']:g} Ah battery ({rec['battery_energy_wh']/1000:.2f} kWh). "
        f"Estimated backup is ~{rec['estimated_backup_hours']:g} hours on essential loads, which {met} your {backup_hours:g}-hour target. "
        "The recommendation has been saved to My Recommendations. Ask me to explain any component in more detail."
    )
    return reply(text, rec=rec, brief=brief)


@bp.get("/chat/history")
@require_auth
def chat_history():
    conn = get_db()
    rows = conn.execute("SELECT * FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 100", (g.user["id"],)).fetchall()
    conn.close()
    return jsonify({"messages": [dict(r) for r in reversed(rows)]})


@bp.delete("/chat/history")
@require_auth
def clear_chat():
    conn = get_db()
    conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (g.user["id"],))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ---------------- Recommendations ----------------
def _rec_row_to_dict(row, include_appliances=True):
    d = dict(row)
    d["assumptions"] = json.loads(d.pop("assumptions_json") or "[]")
    d["triggered_rules"] = json.loads(d.pop("triggered_rules_json") or "[]")
    if include_appliances:
        conn = get_db()
        apps = conn.execute(
            "SELECT appliance_name as name, quantity, wattage_w, hours_per_day, total_w FROM recommendation_appliances WHERE recommendation_id = ?",
            (row["id"],),
        ).fetchall()
        conn.close()
        d["appliances"] = [dict(a) for a in apps]
    return d


@bp.get("/recommendations")
@require_auth
def list_recommendations():
    conn = get_db()
    rows = conn.execute("SELECT * FROM recommendations WHERE user_id = ? ORDER BY id DESC", (g.user["id"],)).fetchall()
    conn.close()
    return jsonify({"recommendations": [_rec_row_to_dict(r, include_appliances=False) for r in rows]})


@bp.get("/recommendations/<int:rec_id>")
@require_auth
def get_recommendation(rec_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM recommendations WHERE id = ? AND user_id = ?", (rec_id, g.user["id"])).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Recommendation not found."}), 404
    return jsonify({"recommendation": _rec_row_to_dict(row)})


@bp.delete("/recommendations/<int:rec_id>")
@require_auth
def delete_recommendation(rec_id):
    conn = get_db()
    cur = conn.execute("DELETE FROM recommendations WHERE id = ? AND user_id = ?", (rec_id, g.user["id"]))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Recommendation not found."}), 404
    return jsonify({"ok": True})


# ---------------- Knowledge base (read: all users; write: admin) ----------------
@bp.get("/knowledge")
@require_auth
def list_knowledge():
    category = request.args.get("category")
    search = request.args.get("search")
    facts = knowledge_base.list_facts(category=category, status="published", search=search)
    return jsonify({"facts": facts})


@bp.get("/knowledge/categories")
@require_auth
def knowledge_categories():
    conn = get_db()
    rows = conn.execute("SELECT DISTINCT category FROM knowledge_facts ORDER BY category").fetchall()
    conn.close()
    return jsonify({"categories": [r["category"] for r in rows]})


@bp.get("/appliances")
@require_auth
def list_appliances():
    return jsonify({"appliances": knowledge_base.get_appliance_catalog()})


@bp.get("/equipment")
@require_auth
def list_equipment():
    return jsonify(knowledge_base.get_equipment())


@bp.get("/rules")
@require_auth
def list_rules():
    return jsonify({"rules": knowledge_base.get_rules()})


@bp.get("/settings")
@require_auth
def get_settings_api():
    return jsonify({"settings": get_settings()})


# ---------------- Admin: knowledge CRUD ----------------
@bp.get("/admin/knowledge")
@require_admin
def admin_list_knowledge():
    search = request.args.get("search")
    facts = knowledge_base.list_facts(status=None, search=search)
    return jsonify({"facts": facts})


@bp.post("/admin/knowledge")
@require_admin
def admin_create_knowledge():
    data = request.get_json(silent=True) or {}
    if not data.get("title") or not data.get("description"):
        return jsonify({"error": "Title and description are required."}), 400
    code = data.get("fact_code") or ("KB-CUSTOM-" + uuid.uuid4().hex[:4].upper())
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO knowledge_facts(fact_code, title, category, description, value_text, source, status) VALUES (?,?,?,?,?,?,?)",
            (code, data["title"], data.get("category", "general"), data["description"],
             data.get("value_text", ""), data.get("source", ""), data.get("status", "published")),
        )
        conn.commit()
    except Exception:
        conn.close()
        return jsonify({"error": "A fact with this code already exists."}), 409
    row = conn.execute("SELECT * FROM knowledge_facts WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify({"fact": dict(row)}), 201


@bp.patch("/admin/knowledge/<int:fact_id>")
@require_admin
def admin_update_knowledge(fact_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    row = conn.execute("SELECT * FROM knowledge_facts WHERE id = ?", (fact_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Fact not found."}), 404
    fields = ["title", "category", "description", "value_text", "source", "status", "fact_code"]
    updates = {f: data[f] for f in fields if f in data}
    if not updates:
        conn.close()
        return jsonify({"error": "No fields to update."}), 400
    sets = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE knowledge_facts SET {sets}, updated_at = datetime('now') WHERE id = ?", (*updates.values(), fact_id))
    conn.commit()
    row = conn.execute("SELECT * FROM knowledge_facts WHERE id = ?", (fact_id,)).fetchone()
    conn.close()
    return jsonify({"fact": dict(row)})


@bp.delete("/admin/knowledge/<int:fact_id>")
@require_admin
def admin_delete_knowledge(fact_id):
    conn = get_db()
    cur = conn.execute("DELETE FROM knowledge_facts WHERE id = ?", (fact_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Fact not found."}), 404
    return jsonify({"ok": True})


# ---------------- Admin: rules CRUD ----------------
@bp.post("/admin/rules")
@require_admin
def admin_create_rule():
    data = request.get_json(silent=True) or {}
    required = ["rule_code", "name", "condition_field", "description"]
    if any(not data.get(f) for f in required):
        return jsonify({"error": "rule_code, name, condition_field and description are required."}), 400
    conn = get_db()
    try:
        cur = conn.execute(
            """INSERT INTO expert_rules(rule_code, name, category, priority, condition_field, operator,
               threshold_value, threshold_value2, action_type, action_value, description, explanation_template, is_active)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (data["rule_code"], data["name"], data.get("category", "general"), int(data.get("priority", 100)),
             data["condition_field"], data.get("operator", "gte"), float(data.get("threshold_value", 0)),
             data.get("threshold_value2"), data.get("action_type", "note"), data.get("action_value", ""),
             data["description"], data.get("explanation_template", ""), 1 if data.get("is_active", True) else 0),
        )
        conn.commit()
    except Exception:
        conn.close()
        return jsonify({"error": "A rule with this code already exists."}), 409
    row = conn.execute("SELECT * FROM expert_rules WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify({"rule": dict(row)}), 201


@bp.patch("/admin/rules/<int:rule_id>")
@require_admin
def admin_update_rule(rule_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    row = conn.execute("SELECT * FROM expert_rules WHERE id = ?", (rule_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Rule not found."}), 404
    fields = ["rule_code", "name", "category", "priority", "condition_field", "operator", "threshold_value",
              "threshold_value2", "action_type", "action_value", "description", "explanation_template", "is_active"]
    updates = {f: data[f] for f in fields if f in data}
    if not updates:
        conn.close()
        return jsonify({"error": "No fields to update."}), 400
    sets = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE expert_rules SET {sets}, updated_at = datetime('now') WHERE id = ?", (*updates.values(), rule_id))
    conn.commit()
    row = conn.execute("SELECT * FROM expert_rules WHERE id = ?", (rule_id,)).fetchone()
    conn.close()
    return jsonify({"rule": dict(row)})


@bp.delete("/admin/rules/<int:rule_id>")
@require_admin
def admin_delete_rule(rule_id):
    conn = get_db()
    cur = conn.execute("DELETE FROM expert_rules WHERE id = ?", (rule_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Rule not found."}), 404
    return jsonify({"ok": True})


# ---------------- Admin: equipment CRUD ----------------
EQUIPMENT_TABLES = {
    "panels": ("solar_panels", ["manufacturer", "model", "wattage_w", "efficiency_pct", "max_power_voltage_v", "status"]),
    "inverters": ("inverters", ["manufacturer", "model", "capacity_kw", "dc_voltage_v", "ac_voltage_v", "surge_kw", "efficiency_pct", "status"]),
    "batteries": ("batteries", ["manufacturer", "model", "technology", "nominal_voltage_v", "capacity_ah", "depth_of_discharge_pct", "efficiency_pct", "cycle_life", "status"]),
}


@bp.post("/admin/equipment/<kind>")
@require_admin
def admin_create_equipment(kind):
    if kind not in EQUIPMENT_TABLES:
        return jsonify({"error": "Unknown equipment type."}), 404
    table, fields = EQUIPMENT_TABLES[kind]
    data = request.get_json(silent=True) or {}
    if not data.get("manufacturer") or not data.get("model"):
        return jsonify({"error": "Manufacturer and model are required."}), 400
    cols = [f for f in fields if f in data]
    conn = get_db()
    cur = conn.execute(
        f"INSERT INTO {table}({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
        tuple(data[c] for c in cols),
    )
    conn.commit()
    row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify({"record": dict(row)}), 201


@bp.patch("/admin/equipment/<kind>/<int:rec_id>")
@require_admin
def admin_update_equipment(kind, rec_id):
    if kind not in EQUIPMENT_TABLES:
        return jsonify({"error": "Unknown equipment type."}), 404
    table, fields = EQUIPMENT_TABLES[kind]
    data = request.get_json(silent=True) or {}
    conn = get_db()
    row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (rec_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Record not found."}), 404
    updates = {f: data[f] for f in fields if f in data}
    if not updates:
        conn.close()
        return jsonify({"error": "No fields to update."}), 400
    sets = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE {table} SET {sets} WHERE id = ?", (*updates.values(), rec_id))
    conn.commit()
    row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (rec_id,)).fetchone()
    conn.close()
    return jsonify({"record": dict(row)})


@bp.delete("/admin/equipment/<kind>/<int:rec_id>")
@require_admin
def admin_delete_equipment(kind, rec_id):
    if kind not in EQUIPMENT_TABLES:
        return jsonify({"error": "Unknown equipment type."}), 404
    table, _ = EQUIPMENT_TABLES[kind]
    conn = get_db()
    cur = conn.execute(f"DELETE FROM {table} WHERE id = ?", (rec_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Record not found."}), 404
    return jsonify({"ok": True})


# ---------------- Admin: appliances CRUD ----------------
@bp.post("/admin/appliances")
@require_admin
def admin_create_appliance():
    data = request.get_json(silent=True) or {}
    if not data.get("name") or not data.get("wattage_w"):
        return jsonify({"error": "Name and wattage are required."}), 400
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO appliances(name, category, wattage_w, typical_hours_per_day, is_essential, description) VALUES (?,?,?,?,?,?)",
            (data["name"], data.get("category", "general"), float(data["wattage_w"]),
             float(data.get("typical_hours_per_day", 4)), 1 if data.get("is_essential", True) else 0,
             data.get("description", "")),
        )
        conn.commit()
    except Exception:
        conn.close()
        return jsonify({"error": "An appliance with this name already exists."}), 409
    row = conn.execute("SELECT * FROM appliances WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify({"appliance": dict(row)}), 201


@bp.patch("/admin/appliances/<int:app_id>")
@require_admin
def admin_update_appliance(app_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    row = conn.execute("SELECT * FROM appliances WHERE id = ?", (app_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Appliance not found."}), 404
    fields = ["name", "category", "wattage_w", "typical_hours_per_day", "is_essential", "description"]
    updates = {f: data[f] for f in fields if f in data}
    sets = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE appliances SET {sets} WHERE id = ?", (*updates.values(), app_id))
    conn.commit()
    row = conn.execute("SELECT * FROM appliances WHERE id = ?", (app_id,)).fetchone()
    conn.close()
    return jsonify({"appliance": dict(row)})


@bp.delete("/admin/appliances/<int:app_id>")
@require_admin
def admin_delete_appliance(app_id):
    conn = get_db()
    cur = conn.execute("DELETE FROM appliances WHERE id = ?", (app_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Appliance not found."}), 404
    return jsonify({"ok": True})


# ---------------- Admin: users, stats, traces, settings ----------------
@bp.get("/admin/users")
@require_admin
def admin_list_users():
    conn = get_db()
    rows = conn.execute(
        """SELECT u.*, (SELECT COUNT(*) FROM recommendations r WHERE r.user_id = u.id) AS consultations
           FROM users u ORDER BY u.id""").fetchall()
    conn.close()
    users = []
    for r in rows:
        d = dict(r)
        users.append(_public_user(d) | {"consultations": d["consultations"], "last_active": d.get("last_active") or "Not yet signed in"})
    return jsonify({"users": users})


@bp.patch("/admin/users/<int:user_id>")
@require_admin
def admin_update_user(user_id):
    data = request.get_json(silent=True) or {}
    if g.user["id"] == user_id and "role" in data:
        return jsonify({"error": "You cannot change your own role."}), 400
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "User not found."}), 404
    updates = {}
    if "role" in data and data["role"] in ("user", "admin"):
        updates["role"] = data["role"]
    if "status" in data and data["status"] in ("active", "suspended", "invited"):
        updates["status"] = data["status"]
    if "name" in data:
        updates["name"] = data["name"]
    if not updates:
        conn.close()
        return jsonify({"error": "No valid fields to update."}), 400
    sets = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE users SET {sets} WHERE id = ?", (*updates.values(), user_id))
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return jsonify({"user": _public_user(dict(row))})


@bp.delete("/admin/users/<int:user_id>")
@require_admin
def admin_delete_user(user_id):
    if g.user["id"] == user_id:
        return jsonify({"error": "You cannot delete your own account."}), 400
    conn = get_db()
    cur = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"ok": True})


@bp.get("/admin/stats")
@require_admin
def admin_stats():
    conn = get_db()
    def count(sql):
        return conn.execute(sql).fetchone()[0]
    stats = {
        "users": count("SELECT COUNT(*) FROM users"),
        "general_users": count("SELECT COUNT(*) FROM users WHERE role='user'"),
        "admins": count("SELECT COUNT(*) FROM users WHERE role='admin'"),
        "recommendations": count("SELECT COUNT(*) FROM recommendations"),
        "knowledge_facts": count("SELECT COUNT(*) FROM knowledge_facts"),
        "rules": count("SELECT COUNT(*) FROM expert_rules"),
        "active_rules": count("SELECT COUNT(*) FROM expert_rules WHERE is_active=1"),
        "appliances": count("SELECT COUNT(*) FROM appliances"),
        "equipment": count("SELECT COUNT(*) FROM solar_panels") + count("SELECT COUNT(*) FROM inverters") + count("SELECT COUNT(*) FROM batteries"),
        "traces": count("SELECT COUNT(*) FROM inference_traces"),
        "contact_messages": count("SELECT COUNT(*) FROM contact_messages"),
    }
    recent = conn.execute(
        "SELECT id, reference, household_context, total_load_w, inverter_capacity_kw, pv_capacity_wp, created_at FROM recommendations ORDER BY id DESC LIMIT 8"
    ).fetchall()
    conn.close()
    return jsonify({"stats": stats, "recent_recommendations": [dict(r) for r in recent]})


@bp.get("/admin/traces")
@require_admin
def admin_traces():
    conn = get_db()
    rows = conn.execute("SELECT * FROM inference_traces ORDER BY id DESC LIMIT 50").fetchall()
    conn.close()
    out = []
    for r in rows:
        d = dict(r)
        d["facts"] = json.loads(d.pop("facts_json") or "{}")
        d["trace"] = json.loads(d.pop("trace_json") or "[]")
        d["triggered_rules"] = json.loads(d.pop("triggered_rules_json") or "[]")
        out.append(d)
    return jsonify({"traces": out})


@bp.patch("/admin/settings")
@require_admin
def admin_update_settings():
    data = request.get_json(silent=True) or {}
    allowed = ["peak_sun_hours", "pv_performance_ratio", "battery_dod", "inverter_efficiency",
               "inverter_safety_margin", "solar_array_reserve", "battery_voltage", "allow_registration"]
    for k in allowed:
        if k in data:
            set_setting(k, data[k])
    return jsonify({"settings": get_settings()})


# ---------------- Rule testing (sandbox) ----------------
@bp.post("/admin/test-rules")
@require_admin
def test_rules():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Please provide sample user requirements to test."}), 400
    catalog = knowledge_base.get_appliance_catalog()
    ext = nlp.extract_requirements(text, catalog)
    if not ext["appliances"]:
        return jsonify({"error": "No appliances could be extracted from that text. Try listing appliances with quantities.",
                        "extraction": ext}), 400
    if ext["backup_hours"] is None:
        ext["backup_hours"] = 8.0  # sandbox default, clearly labelled
        defaulted = True
    else:
        defaulted = False
    rec = _generate_recommendation(ext, g.user["id"])
    conn = get_db()
    conn.execute(
        "INSERT INTO inference_traces(run_type, input_text, facts_json, trace_json, triggered_rules_json, duration_ms) VALUES (?,?,?,?,?,?)",
        ("test", text, json.dumps(rec["facts"]), json.dumps(rec["trace"]), json.dumps(rec["triggered_rules"]), rec["duration_ms"]),
    )
    conn.commit()
    conn.close()
    rec["defaulted_backup"] = defaulted
    return jsonify({"extraction": ext, "recommendation": rec})


# ---------------- Contact ----------------
@bp.post("/contact")
@require_auth
def contact():
    data = request.get_json(silent=True) or {}
    if not data.get("message"):
        return jsonify({"error": "Please write a message."}), 400
    conn = get_db()
    conn.execute(
        "INSERT INTO contact_messages(user_id, name, email, subject, message) VALUES (?,?,?,?,?)",
        (g.user["id"], data.get("name", g.user["name"]), data.get("email", g.user["email"]),
         data.get("subject", ""), data["message"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True}), 201


@bp.get("/health")
def health():
    return jsonify({"status": "ok", "service": "Solar Advisor API", "time": datetime.now(timezone.utc).isoformat()})
