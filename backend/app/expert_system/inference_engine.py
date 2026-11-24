"""Database-driven IF-THEN rule engine with trace generation."""
import time


def _eval_condition(facts, rule):
    field = rule["condition_field"]
    op = rule["operator"]
    v = facts.get(field)
    if v is None:
        return False, "missing fact"
    t = rule["threshold_value"]
    t2 = rule.get("threshold_value2")
    try:
        if op == "lt":
            return v < t, f"{field}={v} < {t}"
        if op == "lte":
            return v <= t, f"{field}={v} <= {t}"
        if op == "gt":
            return v > t, f"{field}={v} > {t}"
        if op == "gte":
            return v >= t, f"{field}={v} >= {t}"
        if op == "eq":
            return v == t, f"{field}={v} == {t}"
        if op == "between":
            return (t <= v <= (t2 if t2 is not None else t)), f"{field}={v} between {t} and {t2}"
    except TypeError:
        return False, "type mismatch"
    return False, f"unknown operator {op}"


def evaluate_rules(facts, rules):
    """Evaluate active rules in priority order. Returns (triggered, trace)."""
    start = time.time()
    ordered = sorted([r for r in rules if r.get("is_active", 1)], key=lambda r: r["priority"])
    triggered = []
    trace = []
    for idx, rule in enumerate(ordered, start=1):
        fired, detail = _eval_condition(facts, rule)
        explanation = ""
        if fired:
            try:
                explanation = rule.get("explanation_template", "").format(**facts)
            except (KeyError, IndexError):
                explanation = rule.get("explanation_template", "")
            triggered.append(rule["rule_code"])
        trace.append({
            "step": idx,
            "rule_code": rule["rule_code"],
            "name": rule["name"],
            "category": rule.get("category", ""),
            "priority": rule["priority"],
            "triggered": fired,
            "condition_detail": detail,
            "description": rule.get("description", ""),
            "explanation": explanation,
            "action_type": rule.get("action_type", ""),
            "action_value": rule.get("action_value", ""),
        })
    duration_ms = int((time.time() - start) * 1000)
    return triggered, trace, duration_ms


def build_facts(extraction, calc_result):
    """Assemble the fact dictionary used by the rule engine."""
    appliances = extraction.get("appliances", [])
    motor_names = {"Refrigerator", "Water pump", "Washing machine", "Freezer", "Air conditioner"}
    has_motor = 1 if any(a["name"] in motor_names for a in appliances) else 0
    facts = {
        "appliance_count": len(appliances),
        "total_load_w": calc_result.get("total_load_w", 0) if calc_result else 0,
        "daily_energy_wh": calc_result.get("daily_energy_wh", 0) if calc_result else 0,
        "essential_load_w": calc_result.get("essential_load_w", 0) if calc_result else 0,
        "backup_hours_target": extraction.get("backup_hours") or 0,
        "has_motor_load": has_motor,
        "required_inverter_w": calc_result.get("required_inverter_w", 0) if calc_result else 0,
        "inverter_capacity_kw": calc_result.get("inverter_capacity_kw", 0) if calc_result else 0,
        "pv_required_wp": calc_result.get("pv_required_wp", 0) if calc_result else 0,
        "pv_capacity_wp": calc_result.get("pv_capacity_wp", 0) if calc_result else 0,
        "pv_panel_count": calc_result.get("pv_panel_count", 0) if calc_result else 0,
        "pv_panel_wattage_w": calc_result.get("pv_panel_wattage_w", 0) if calc_result else 0,
        "battery_required_wh": calc_result.get("battery_required_wh", 0) if calc_result else 0,
        "peak_sun_hours": calc_result["assumptions"]["peak_sun_hours"] if calc_result else 4.0,
        "pv_ratio": calc_result["assumptions"]["pv_performance_ratio"] if calc_result else 0.80,
        "dod": calc_result["assumptions"]["battery_dod"] if calc_result else 0.80,
        "inv_eff": calc_result["assumptions"]["inverter_efficiency"] if calc_result else 0.90,
    }
    return facts
