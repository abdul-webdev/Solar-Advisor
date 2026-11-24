import pytest

from app.expert_system import calculations as c

APPS = [
    {"name": "Ceiling fan", "quantity": 4, "wattage_w": 75, "hours_per_day": 12, "is_essential": 1},
    {"name": "LED light", "quantity": 8, "wattage_w": 9, "hours_per_day": 8, "is_essential": 1},
    {"name": "Refrigerator", "quantity": 1, "wattage_w": 200, "hours_per_day": 12, "is_essential": 1},
    {"name": "LED television", "quantity": 1, "wattage_w": 100, "hours_per_day": 4, "is_essential": 1},
    {"name": "Washing machine", "quantity": 1, "wattage_w": 1440, "hours_per_day": 1, "is_essential": 0},
]


def test_total_connected_load():
    assert c.total_connected_load(APPS) == 2112


def test_daily_energy():
    # 300*12 + 72*8 + 200*12 + 100*4 + 1440*1 = 3600+576+2400+400+1440
    assert c.daily_energy_wh(APPS) == 8416


def test_essential_load_excludes_washer():
    assert c.essential_load_w(APPS) == 672


def test_inverter_margin():
    assert c.required_inverter_w(2112, 0.25) == pytest.approx(2640)


def test_pv_capacity():
    wp = c.pv_capacity_wp(8416, 4.0, 0.80, 0.20)
    assert wp == pytest.approx(3156.0)


def test_pv_division_by_zero_guard():
    with pytest.raises(ValueError):
        c.pv_capacity_wp(1000, 0, 0.8, 0.2)
    with pytest.raises(ValueError):
        c.pv_capacity_wp(1000, 4.0, 0, 0.2)


def test_battery_formulas():
    wh = c.battery_nominal_wh(672, 8, 0.80, 0.90)
    assert wh == pytest.approx(7466.67, rel=1e-3)
    assert c.battery_capacity_ah(5120, 51.2) == pytest.approx(100)
    with pytest.raises(ValueError):
        c.battery_capacity_ah(1000, 0)


def test_backup_hours_zero_load_guard():
    assert c.estimated_backup_hours(10000, 0.8, 0.9, 0) == 0.0
    assert c.estimated_backup_hours(10000, 0.8, 0.9, 1000) == pytest.approx(7.2)


def test_select_inverter_and_panel_count():
    invs = [{"capacity_kw": 1.0}, {"capacity_kw": 3.0}, {"capacity_kw": 5.0}]
    assert c.select_inverter(2640, invs)["capacity_kw"] == 3.0
    assert c.panel_count(3156, 550) == 6
    assert c.panel_count(0, 550) == 0
