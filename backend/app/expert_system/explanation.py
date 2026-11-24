"""Explanation facility: turns facts + trace into human-readable reasoning."""


def build_explanation(calc, triggered, trace, extraction):
    lines = []
    a = calc["assumptions"]
    lines.append(
        f"INV: {calc['total_load_w']:,.0f} W × {1 + a['inverter_safety_margin']:.2f} = "
        f"{calc['required_inverter_w']:,.0f} W → select {calc['inverter_capacity_kw']:g} kW inverter."
    )
    lines.append(
        f"PV: {calc['daily_energy_wh']:,.0f} Wh ÷ ({a['peak_sun_hours']:g} PSH × {a['pv_performance_ratio']:.2f}) "
        f"× {1 + a['solar_array_reserve']:.2f} reserve = {calc['pv_required_wp']:,.0f} Wp → "
        f"{calc['pv_panel_count']} × {calc['pv_panel_wattage_w']:g} W = {calc['pv_capacity_wp']:,.0f} Wp array."
    )
    lines.append(
        f"BAT: {calc['essential_load_w']:,.0f} W × {extraction.get('backup_hours') or 0:g} h ÷ "
        f"({a['battery_dod']:.2f} × {a['inverter_efficiency']:.2f}) = {calc['battery_required_wh']:,.0f} Wh nominal → "
        f"{calc['battery_voltage_v']:g} V / {calc['battery_capacity_ah']:g} Ah ({calc['battery_energy_wh']:,.0f} Wh)."
    )
    lines.append(
        f"Backup: {calc['usable_energy_wh']:,.0f} Wh usable ÷ {calc['essential_load_w']:,.0f} W essential load "
        f"≈ {calc['estimated_backup_hours']:g} hours (target {extraction.get('backup_hours') or 0:g} h)."
    )
    return "\n".join(lines)


def build_assumptions_text(calc, extraction):
    a = calc["assumptions"]
    items = [
        f"{a['peak_sun_hours']:g} peak sun hours / day",
        f"{int(a['pv_performance_ratio'] * 100)}% PV performance ratio",
        f"{int(a['battery_dod'] * 100)}% battery depth of discharge",
        f"{int(a['inverter_efficiency'] * 100)}% inverter efficiency",
        f"{int(a['inverter_safety_margin'] * 100)}% inverter safety margin",
        f"{int(a['solar_array_reserve'] * 100)}% solar array reserve",
        "Nameplate wattages and typical duty cycles assumed — confirm to refine.",
        "Preliminary sizing, not an installation design. An engineer must verify surge, wiring and site conditions.",
    ]
    return items
