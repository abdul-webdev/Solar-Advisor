/**
 * Database-driven IF-THEN rule engine — browser port of inference_engine.py
 * plus the explanation facility from explanation.py.
 */

function evalCondition(facts, rule) {
  const v = facts[rule.condition_field];
  if (v === undefined || v === null) return [false, 'missing fact'];
  const t = rule.threshold_value;
  const t2 = rule.threshold_value2;
  switch (rule.operator) {
    case 'lt': return [v < t, `${rule.condition_field}=${v} < ${t}`];
    case 'lte': return [v <= t, `${rule.condition_field}=${v} <= ${t}`];
    case 'gt': return [v > t, `${rule.condition_field}=${v} > ${t}`];
    case 'gte': return [v >= t, `${rule.condition_field}=${v} >= ${t}`];
    case 'eq': return [v === t, `${rule.condition_field}=${v} == ${t}`];
    case 'between': return [v >= t && v <= (t2 ?? t), `${rule.condition_field}=${v} between ${t} and ${t2}`];
    default: return [false, `unknown operator ${rule.operator}`];
  }
}

function formatTemplate(template, facts) {
  return String(template || '').replace(/\{(\w+)\}/g, (whole, key) =>
    (facts[key] !== undefined ? facts[key] : whole));
}

export function evaluateRules(facts, rules) {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ordered = rules.filter((r) => r.is_active ?? 1).sort((a, b) => a.priority - b.priority);
  const triggered = [];
  const trace = [];
  ordered.forEach((rule, i) => {
    const [fired, detail] = evalCondition(facts, rule);
    const explanation = fired ? formatTemplate(rule.explanation_template, facts) : '';
    if (fired) triggered.push(rule.rule_code);
    trace.push({
      step: i + 1,
      rule_code: rule.rule_code,
      name: rule.name,
      category: rule.category,
      priority: rule.priority,
      triggered: fired,
      condition_detail: detail,
      description: rule.description,
      explanation,
      action_type: rule.action_type,
      action_value: rule.action_value,
    });
  });
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { triggered, trace, duration_ms: Math.max(1, Math.round(end - start)) };
}

const MOTOR_NAMES = new Set(['Refrigerator', 'Water pump', 'Washing machine', 'Freezer', 'Air conditioner']);

export function buildFacts(extraction, calc) {
  const appliances = extraction.appliances || [];
  const hasMotor = appliances.some((a) => MOTOR_NAMES.has(a.name)) ? 1 : 0;
  return {
    appliance_count: appliances.length,
    total_load_w: calc?.total_load_w ?? 0,
    daily_energy_wh: calc?.daily_energy_wh ?? 0,
    essential_load_w: calc?.essential_load_w ?? 0,
    backup_hours_target: extraction.backup_hours || 0,
    has_motor_load: hasMotor,
    required_inverter_w: calc?.required_inverter_w ?? 0,
    inverter_capacity_kw: calc?.inverter_capacity_kw ?? 0,
    pv_required_wp: calc?.pv_required_wp ?? 0,
    pv_capacity_wp: calc?.pv_capacity_wp ?? 0,
    pv_panel_count: calc?.pv_panel_count ?? 0,
    pv_panel_wattage_w: calc?.pv_panel_wattage_w ?? 0,
    battery_required_wh: calc?.battery_required_wh ?? 0,
    peak_sun_hours: calc?.assumptions?.peak_sun_hours ?? 4.0,
    pv_ratio: calc?.assumptions?.pv_performance_ratio ?? 0.8,
    dod: calc?.assumptions?.battery_dod ?? 0.8,
    inv_eff: calc?.assumptions?.inverter_efficiency ?? 0.9,
  };
}

const n0 = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
const g = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
};

/** Explanation facility — mirrors explanation.build_explanation(). */
export function buildExplanation(calc, extraction) {
  const a = calc.assumptions;
  const target = g(extraction.backup_hours || 0);
  return [
    `INV: ${n0(calc.total_load_w)} W × ${(1 + a.inverter_safety_margin).toFixed(2)} = ` +
      `${n0(calc.required_inverter_w)} W → select ${g(calc.inverter_capacity_kw)} kW inverter.`,
    `PV: ${n0(calc.daily_energy_wh)} Wh ÷ (${g(a.peak_sun_hours)} PSH × ${a.pv_performance_ratio.toFixed(2)}) ` +
      `× ${(1 + a.solar_array_reserve).toFixed(2)} reserve = ${n0(calc.pv_required_wp)} Wp → ` +
      `${calc.pv_panel_count} × ${g(calc.pv_panel_wattage_w)} W = ${n0(calc.pv_capacity_wp)} Wp array.`,
    `BAT: ${n0(calc.essential_load_w)} W × ${target} h ÷ ` +
      `(${a.battery_dod.toFixed(2)} × ${a.inverter_efficiency.toFixed(2)}) = ${n0(calc.battery_required_wh)} Wh nominal → ` +
      `${g(calc.battery_voltage_v)} V / ${g(calc.battery_capacity_ah)} Ah (${n0(calc.battery_energy_wh)} Wh).`,
    `Backup: ${n0(calc.usable_energy_wh)} Wh usable ÷ ${n0(calc.essential_load_w)} W essential load ` +
      `≈ ${g(calc.estimated_backup_hours)} hours (target ${target} h).`,
  ].join('\n');
}

/** Mirrors explanation.build_assumptions_text(). */
export function buildAssumptionsText(calc) {
  const a = calc.assumptions;
  return [
    `${g(a.peak_sun_hours)} peak sun hours / day`,
    `${Math.round(a.pv_performance_ratio * 100)}% PV performance ratio`,
    `${Math.round(a.battery_dod * 100)}% battery depth of discharge`,
    `${Math.round(a.inverter_efficiency * 100)}% inverter efficiency`,
    `${Math.round(a.inverter_safety_margin * 100)}% inverter safety margin`,
    `${Math.round(a.solar_array_reserve * 100)}% solar array reserve`,
    'Nameplate wattages and typical duty cycles assumed — confirm to refine.',
    'Preliminary sizing, not an installation design. An engineer must verify surge, wiring and site conditions.',
  ];
}
