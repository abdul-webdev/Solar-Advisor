from app.expert_system import inference_engine, knowledge_base


def test_rule_evaluation_triggers_expected_rules():
    facts = {
        "appliance_count": 5, "total_load_w": 2112, "daily_energy_wh": 8416,
        "essential_load_w": 672, "backup_hours_target": 8, "has_motor_load": 1,
        "required_inverter_w": 2640, "inverter_capacity_kw": 3, "pv_required_wp": 3156,
        "pv_capacity_wp": 3300, "pv_panel_count": 6, "pv_panel_wattage_w": 550,
        "battery_required_wh": 7467, "peak_sun_hours": 4.0, "pv_ratio": 0.80,
        "dod": 0.80, "inv_eff": 0.90,
    }
    rules = knowledge_base.get_rules()
    triggered, trace, duration = inference_engine.evaluate_rules(facts, rules)
    assert "INV-002" in triggered
    assert "PV-004" in triggered
    assert "BAT-003" in triggered
    assert "SUR-005" in triggered
    assert "INV-001" not in triggered  # load is not below 1000 W
    assert len(trace) == len(rules)
    assert duration >= 0


def test_missing_backup_triggers_warning_rule():
    facts = {"appliance_count": 2, "total_load_w": 325, "daily_energy_wh": 1000,
             "essential_load_w": 325, "backup_hours_target": 0, "has_motor_load": 0,
             "required_inverter_w": 406, "inverter_capacity_kw": 1, "pv_required_wp": 375,
             "pv_capacity_wp": 550, "pv_panel_count": 1, "pv_panel_wattage_w": 550,
             "battery_required_wh": 0, "peak_sun_hours": 4.0, "pv_ratio": 0.80,
             "dod": 0.80, "inv_eff": 0.90}
    triggered, _, _ = inference_engine.evaluate_rules(facts, knowledge_base.get_rules())
    assert "WARN-009" in triggered
    assert "INV-001" in triggered  # small load band


def test_build_facts():
    ext = {"appliances": [{"name": "Refrigerator", "quantity": 1, "wattage_w": 200,
                           "hours_per_day": 12, "is_essential": 1}], "backup_hours": 6}
    calc = {"total_load_w": 200, "daily_energy_wh": 2400, "essential_load_w": 200,
            "required_inverter_w": 250, "inverter_capacity_kw": 1, "pv_required_wp": 900,
            "pv_capacity_wp": 1100, "pv_panel_count": 2, "pv_panel_wattage_w": 550,
            "battery_required_wh": 1667, "assumptions": {"peak_sun_hours": 4.0,
            "pv_performance_ratio": 0.8, "battery_dod": 0.8, "inverter_efficiency": 0.9}}
    facts = inference_engine.build_facts(ext, calc)
    assert facts["has_motor_load"] == 1
    assert facts["backup_hours_target"] == 6
