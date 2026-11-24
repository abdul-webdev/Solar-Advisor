/**
 * Parity test: the browser engine must reproduce the Python engine's numbers
 * exactly. Vectors were produced by running the real Flask pipeline.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRequirements } from '../nlp.js';
import { generateRecommendation, catalog } from '../advisor.js';

const EXAMPLE = 'I have a two-bedroom house with 4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine. I need backup for around 8 hours. What solar system do you recommend?';

test('extraction matches the Python extractor on the reference sentence', () => {
  const ext = extractRequirements(EXAMPLE, catalog);
  const byName = Object.fromEntries(ext.appliances.map((a) => [a.name, a.quantity]));
  assert.equal(byName['Ceiling fan'], 4);
  assert.equal(byName['LED light'], 8);
  assert.equal(byName.Refrigerator, 1);
  assert.equal(byName['LED television'], 1);
  assert.equal(byName['Washing machine'], 1);
  assert.equal(ext.backup_hours, 8);
  assert.equal(ext.bedrooms, 2);
});

test('sizing matches the Python engine exactly (Figma reference case)', () => {
  const ext = extractRequirements(EXAMPLE, catalog);
  const rec = generateRecommendation(ext);
  assert.equal(rec.total_load_w, 2112);
  assert.equal(rec.daily_energy_wh, 8416);
  assert.equal(rec.essential_load_w, 672);
  assert.equal(rec.required_inverter_w, 2640);
  assert.equal(rec.inverter_capacity_kw, 3);
  assert.equal(rec.pv_required_wp, 3156);
  assert.equal(rec.pv_panel_count, 6);
  assert.equal(rec.pv_panel_wattage_w, 550);
  assert.equal(rec.pv_capacity_wp, 3300);
  assert.equal(rec.battery_required_wh, 7466.7);
  assert.equal(rec.battery_voltage_v, 51.2);
  assert.equal(rec.battery_capacity_ah, 150);
  assert.equal(rec.battery_energy_wh, 7680);
  assert.equal(rec.estimated_backup_hours, 8.2);
});

test('fires the same rule set as the Python engine', () => {
  const ext = extractRequirements(EXAMPLE, catalog);
  const rec = generateRecommendation(ext);
  for (const code of ['NLP-001', 'INV-002', 'PV-004', 'PV-006', 'BAT-003', 'BAT-007', 'SUR-005', 'ESS-008']) {
    assert.ok(rec.triggered_rules.includes(code), `${code} should fire`);
  }
  assert.ok(!rec.triggered_rules.includes('INV-001'), 'INV-001 must not fire (load >= 1000 W)');
  assert.equal(rec.trace.length, 11, 'all 11 rules are evaluated');
});

test('explanation lines match the Python explanation facility', () => {
  const ext = extractRequirements(EXAMPLE, catalog);
  const rec = generateRecommendation(ext);
  const lines = rec.explanation.split('\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[0], 'INV: 2,112 W × 1.25 = 2,640 W → select 3 kW inverter.');
  assert.ok(lines[1].startsWith('PV: 8,416 Wh ÷ (4 PSH × 0.80)'));
  assert.ok(lines[2].startsWith('BAT: 672 W × 8 h ÷ (0.80 × 0.90)'));
  assert.ok(lines[3].includes('≈ 8.2 hours (target 8 h)'));
});

test('second reference case: 3 fans, 5 lights, fridge, TV, 6 h backup', () => {
  const ext = extractRequirements('I have 3 fans, 5 lights, one refrigerator, and a television. I need backup for 6 hours.', catalog);
  const rec = generateRecommendation(ext);
  assert.equal(rec.total_load_w, 570);
  assert.equal(rec.backup_hours_target, 6);
  assert.ok(rec.pv_capacity_wp > 0);
  assert.ok(rec.battery_energy_wh > 0);
});

test('missing backup hours is not guessed', () => {
  const ext = extractRequirements('I have 3 fans and a television.', catalog);
  assert.equal(ext.backup_hours, null);
  assert.equal(ext.appliances.length, 2);
});

test('no appliances found returns an empty list (route asks for clarification)', () => {
  const ext = extractRequirements('Hello, what is solar energy?', catalog);
  assert.equal(ext.appliances.length, 0);
});
