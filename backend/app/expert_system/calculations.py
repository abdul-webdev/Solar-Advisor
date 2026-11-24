"""Transparent engineering calculation engine.

All formulas are documented and unit-tested. Values are educational
estimates, not certified installation advice.
"""
import math


def total_connected_load(appliances):
    """Sum of quantity x wattage. appliances: list of dicts with quantity, wattage_w."""
    return sum(a.get("quantity", 1) * a.get("wattage_w", 0) for a in appliances)


def daily_energy_wh(appliances):
    """Sum of quantity x wattage x hours_per_day (Wh/day)."""
    return sum(
        a.get("quantity", 1) * a.get("wattage_w", 0) * a.get("hours_per_day", 0)
        for a in appliances
    )


def essential_load_w(appliances):
    """Load that should run during an outage (is_essential flag)."""
    return sum(
        a.get("quantity", 1) * a.get("wattage_w", 0)
        for a in appliances
        if a.get("is_essential", 1)
    )


def required_inverter_w(total_load_w, safety_margin=0.25):
    """Inverter capacity = simultaneous load x (1 + margin)."""
    if total_load_w < 0:
        raise ValueError("total_load_w cannot be negative")
    return total_load_w * (1 + safety_margin)


def select_inverter(required_w, inverters):
    """Smallest inverter (kW) whose capacity >= required. inverters: list of dicts."""
    required_kw = required_w / 1000.0
    candidates = sorted(inverters, key=lambda x: x["capacity_kw"])
    for inv in candidates:
        if inv["capacity_kw"] >= required_kw:
            return inv
    return candidates[-1] if candidates else None


def pv_capacity_wp(daily_wh, peak_sun_hours=4.0, performance_ratio=0.80, reserve=0.20):
    """PV Wp = daily Wh / (PSH x PR) x (1 + reserve). Guards division by zero."""
    if peak_sun_hours <= 0:
        raise ValueError("peak_sun_hours must be > 0")
    if performance_ratio <= 0:
        raise ValueError("performance_ratio must be > 0")
    if daily_wh < 0:
        raise ValueError("daily_wh cannot be negative")
    return (daily_wh / (peak_sun_hours * performance_ratio)) * (1 + reserve)


def panel_count(required_wp, panel_wattage_w):
    if panel_wattage_w <= 0:
        raise ValueError("panel_wattage_w must be > 0")
    if required_wp <= 0:
        return 0
    return math.ceil(required_wp / panel_wattage_w)


def battery_nominal_wh(essential_w, backup_hours, dod=0.80, efficiency=0.90):
    """Nominal Wh = essential W x hours / (DoD x efficiency)."""
    if dod <= 0 or dod > 1:
        raise ValueError("dod must be in (0, 1]")
    if efficiency <= 0 or efficiency > 1:
        raise ValueError("efficiency must be in (0, 1]")
    if essential_w < 0 or backup_hours < 0:
        raise ValueError("essential_w and backup_hours cannot be negative")
    return (essential_w * backup_hours) / (dod * efficiency)


def battery_capacity_ah(energy_wh, voltage_v):
    if voltage_v <= 0:
        raise ValueError("voltage_v must be > 0")
    return energy_wh / voltage_v


def select_battery(required_wh, batteries):
    """Smallest battery bank (Wh) >= required. batteries: list of dicts."""
    def wh(b):
        return b["nominal_voltage_v"] * b["capacity_ah"]

    candidates = sorted(batteries, key=wh)
    for b in candidates:
        if wh(b) >= required_wh:
            return b
    return candidates[-1] if candidates else None


def estimated_backup_hours(battery_wh, dod, efficiency, load_w):
    """Usable Wh / load W. Returns 0 when load is 0 (no division by zero)."""
    if load_w <= 0:
        return 0.0
    usable = battery_wh * dod * efficiency
    return usable / load_w


def run_all_calculations(appliances, backup_hours, settings, inverters, batteries, panels):
    """Run the full sizing pipeline and return a dict of intermediate values."""
    peak_sun = float(settings.get("peak_sun_hours", 4.0))
    pr = float(settings.get("pv_performance_ratio", 0.80))
    dod = float(settings.get("battery_dod", 0.80))
    inv_eff = float(settings.get("inverter_efficiency", 0.90))
    margin = float(settings.get("inverter_safety_margin", 0.25))
    reserve = float(settings.get("solar_array_reserve", 0.20))

    total_w = total_connected_load(appliances)
    daily_wh = daily_energy_wh(appliances)
    essential_w = essential_load_w(appliances)

    req_inv_w = required_inverter_w(total_w, margin)
    inverter = select_inverter(req_inv_w, inverters)

    pv_req_wp = pv_capacity_wp(daily_wh, peak_sun, pr, reserve)
    # Prefer the largest standard module for fewer panels (550 W default).
    panel = max(panels, key=lambda p: p["wattage_w"]) if panels else {"wattage_w": 550, "model": "550 W module"}
    n_panels = panel_count(pv_req_wp, panel["wattage_w"])
    pv_wp = n_panels * panel["wattage_w"]

    batt_req_wh = battery_nominal_wh(essential_w, backup_hours, dod, inv_eff)
    battery = select_battery(batt_req_wh, batteries)
    batt_wh = battery["nominal_voltage_v"] * battery["capacity_ah"] if battery else batt_req_wh
    batt_ah = battery["capacity_ah"] if battery else battery_capacity_ah(batt_req_wh, 51.2)
    batt_v = battery["nominal_voltage_v"] if battery else 51.2
    usable_wh = batt_wh * dod * inv_eff
    backup_est_h = estimated_backup_hours(batt_wh, dod, inv_eff, essential_w)
    backup_at_1kw_h = usable_wh / 1000.0 if usable_wh else 0.0

    return {
        "total_load_w": round(total_w, 1),
        "daily_energy_wh": round(daily_wh, 1),
        "daily_energy_kwh": round(daily_wh / 1000.0, 2),
        "essential_load_w": round(essential_w, 1),
        "required_inverter_w": round(req_inv_w, 1),
        "inverter": inverter,
        "inverter_capacity_kw": inverter["capacity_kw"] if inverter else round(req_inv_w / 1000.0, 2),
        "pv_required_wp": round(pv_req_wp, 1),
        "pv_capacity_wp": round(pv_wp, 1),
        "pv_panel_count": n_panels,
        "pv_panel_wattage_w": panel["wattage_w"],
        "pv_panel_model": panel.get("model", ""),
        "battery_required_wh": round(batt_req_wh, 1),
        "battery_energy_wh": round(batt_wh, 1),
        "battery_voltage_v": batt_v,
        "battery_capacity_ah": batt_ah,
        "battery_model": battery.get("model", "") if battery else "",
        "usable_energy_wh": round(usable_wh, 1),
        "estimated_backup_hours": round(backup_est_h, 1),
        "backup_at_1kw_hours": round(backup_at_1kw_h, 1),
        "assumptions": {
            "peak_sun_hours": peak_sun,
            "pv_performance_ratio": pr,
            "battery_dod": dod,
            "inverter_efficiency": inv_eff,
            "inverter_safety_margin": margin,
            "solar_array_reserve": reserve,
        },
    }
