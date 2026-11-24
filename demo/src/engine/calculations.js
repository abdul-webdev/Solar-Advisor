/**
 * Engineering calculation engine — browser port.
 *
 * This is a line-for-line port of backend/app/expert_system/calculations.py so the
 * static demo produces byte-identical numbers to the Flask service. Both are
 * verified by the same test vectors (see demo/src/engine/engine.test.mjs).
 */

export function totalConnectedLoad(appliances) {
  return appliances.reduce((s, a) => s + (a.quantity ?? 1) * (a.wattage_w ?? 0), 0);
}

export function dailyEnergyWh(appliances) {
  return appliances.reduce(
    (s, a) => s + (a.quantity ?? 1) * (a.wattage_w ?? 0) * (a.hours_per_day ?? 0), 0);
}

export function essentialLoadW(appliances) {
  return appliances.reduce(
    (s, a) => s + ((a.is_essential ?? 1) ? (a.quantity ?? 1) * (a.wattage_w ?? 0) : 0), 0);
}

export function requiredInverterW(totalLoadW, safetyMargin = 0.25) {
  if (totalLoadW < 0) throw new Error('total_load_w cannot be negative');
  return totalLoadW * (1 + safetyMargin);
}

export function selectInverter(requiredW, inverters) {
  const requiredKw = requiredW / 1000;
  const candidates = [...inverters].sort((a, b) => a.capacity_kw - b.capacity_kw);
  for (const inv of candidates) if (inv.capacity_kw >= requiredKw) return inv;
  return candidates.length ? candidates[candidates.length - 1] : null;
}

export function pvCapacityWp(dailyWh, peakSunHours = 4.0, performanceRatio = 0.8, reserve = 0.2) {
  if (peakSunHours <= 0) throw new Error('peak_sun_hours must be > 0');
  if (performanceRatio <= 0) throw new Error('performance_ratio must be > 0');
  if (dailyWh < 0) throw new Error('daily_wh cannot be negative');
  return (dailyWh / (peakSunHours * performanceRatio)) * (1 + reserve);
}

export function panelCount(requiredWp, panelWattageW) {
  if (panelWattageW <= 0) throw new Error('panel_wattage_w must be > 0');
  if (requiredWp <= 0) return 0;
  return Math.ceil(requiredWp / panelWattageW);
}

export function batteryNominalWh(essentialW, backupHours, dod = 0.8, efficiency = 0.9) {
  if (dod <= 0 || dod > 1) throw new Error('dod must be in (0, 1]');
  if (efficiency <= 0 || efficiency > 1) throw new Error('efficiency must be in (0, 1]');
  if (essentialW < 0 || backupHours < 0) throw new Error('negative input');
  return (essentialW * backupHours) / (dod * efficiency);
}

export function batteryCapacityAh(energyWh, voltageV) {
  if (voltageV <= 0) throw new Error('voltage_v must be > 0');
  return energyWh / voltageV;
}

export function selectBattery(requiredWh, batteries) {
  const wh = (b) => b.nominal_voltage_v * b.capacity_ah;
  const candidates = [...batteries].sort((a, b) => wh(a) - wh(b));
  for (const b of candidates) if (wh(b) >= requiredWh) return b;
  return candidates.length ? candidates[candidates.length - 1] : null;
}

export function estimatedBackupHours(batteryWh, dod, efficiency, loadW) {
  if (loadW <= 0) return 0;
  return (batteryWh * dod * efficiency) / loadW;
}

const round = (v, d = 1) => Number(v.toFixed(d));

/** Run the full sizing pipeline. Mirrors run_all_calculations() in the Python engine. */
export function runAllCalculations(appliances, backupHours, settings, inverters, batteries, panels) {
  const peakSun = parseFloat(settings.peak_sun_hours ?? 4.0);
  const pr = parseFloat(settings.pv_performance_ratio ?? 0.8);
  const dod = parseFloat(settings.battery_dod ?? 0.8);
  const invEff = parseFloat(settings.inverter_efficiency ?? 0.9);
  const margin = parseFloat(settings.inverter_safety_margin ?? 0.25);
  const reserve = parseFloat(settings.solar_array_reserve ?? 0.2);

  const totalW = totalConnectedLoad(appliances);
  const dailyWh = dailyEnergyWh(appliances);
  const essentialW = essentialLoadW(appliances);

  const reqInvW = requiredInverterW(totalW, margin);
  const inverter = selectInverter(reqInvW, inverters);

  const pvReqWp = pvCapacityWp(dailyWh, peakSun, pr, reserve);
  const panel = panels.length
    ? panels.reduce((a, b) => (b.wattage_w > a.wattage_w ? b : a))
    : { wattage_w: 550, model: '550 W module' };
  const nPanels = panelCount(pvReqWp, panel.wattage_w);
  const pvWp = nPanels * panel.wattage_w;

  const battReqWh = batteryNominalWh(essentialW, backupHours, dod, invEff);
  const battery = selectBattery(battReqWh, batteries);
  const battWh = battery ? battery.nominal_voltage_v * battery.capacity_ah : battReqWh;
  const battAh = battery ? battery.capacity_ah : batteryCapacityAh(battReqWh, 51.2);
  const battV = battery ? battery.nominal_voltage_v : 51.2;
  const usableWh = battWh * dod * invEff;
  const backupEstH = estimatedBackupHours(battWh, dod, invEff, essentialW);
  const backupAt1kwH = usableWh ? usableWh / 1000 : 0;

  return {
    total_load_w: round(totalW),
    daily_energy_wh: round(dailyWh),
    daily_energy_kwh: round(dailyWh / 1000, 2),
    essential_load_w: round(essentialW),
    required_inverter_w: round(reqInvW),
    inverter_capacity_kw: inverter ? inverter.capacity_kw : round(reqInvW / 1000, 2),
    inverter_model: inverter ? `${inverter.manufacturer} ${inverter.model}` : '',
    pv_required_wp: round(pvReqWp),
    pv_capacity_wp: round(pvWp),
    pv_panel_count: nPanels,
    pv_panel_wattage_w: panel.wattage_w,
    pv_panel_model: panel.model ?? '',
    battery_required_wh: round(battReqWh),
    battery_energy_wh: round(battWh),
    battery_voltage_v: battV,
    battery_capacity_ah: battAh,
    battery_model: battery ? `${battery.manufacturer} ${battery.model}` : '',
    usable_energy_wh: round(usableWh),
    estimated_backup_hours: round(backupEstH),
    backup_at_1kw_hours: round(backupAt1kwH),
    assumptions: {
      peak_sun_hours: peakSun,
      pv_performance_ratio: pr,
      battery_dod: dod,
      inverter_efficiency: invEff,
      inverter_safety_margin: margin,
      solar_array_reserve: reserve,
    },
  };
}
