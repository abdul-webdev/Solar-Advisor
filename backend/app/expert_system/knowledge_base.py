"""Knowledge base access helpers."""
from app.database import get_db


def list_facts(category=None, status="published", search=None):
    conn = get_db()
    query = "SELECT * FROM knowledge_facts WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (title LIKE ? OR description LIKE ? OR fact_code LIKE ?)"
        params += [f"%{search}%"] * 3
    query += " ORDER BY fact_code"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_appliance_catalog():
    conn = get_db()
    rows = conn.execute("SELECT * FROM appliances ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_rules():
    conn = get_db()
    rows = conn.execute("SELECT * FROM expert_rules ORDER BY priority, rule_code").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_equipment():
    conn = get_db()
    panels = [dict(r) for r in conn.execute("SELECT * FROM solar_panels ORDER BY wattage_w DESC").fetchall()]
    inverters = [dict(r) for r in conn.execute("SELECT * FROM inverters ORDER BY capacity_kw").fetchall()]
    batteries = [dict(r) for r in conn.execute("SELECT * FROM batteries ORDER BY nominal_voltage_v, capacity_ah").fetchall()]
    conn.close()
    return {"panels": panels, "inverters": inverters, "batteries": batteries}
