/** Orchestrator: the same pipeline the Flask /api/chat route runs. */
import { extractRequirements, mergeExtractions } from './nlp.js';
import { runAllCalculations } from './calculations.js';
import { buildFacts, evaluateRules, buildExplanation, buildAssumptionsText } from './inference.js';
import seed from '../data/seed.json' with { type: 'json' };

export const catalog = seed.appliances;
export const equipment = { panels: seed.panels, inverters: seed.inverters, batteries: seed.batteries };
export const rules = seed.rules;
export const facts = seed.facts;
export const settings = seed.settings;

/**
 * @param {{appliances:Array, backup_hours:number, household_context?:string, input_text?:string}} extraction
 */
export function generateRecommendation(extraction) {
  const calc = runAllCalculations(
    extraction.appliances,
    extraction.backup_hours || 0,
    settings,
    equipment.inverters,
    equipment.batteries,
    equipment.panels,
  );
  const workingFacts = buildFacts(extraction, calc);
  const { triggered, trace, duration_ms } = evaluateRules(workingFacts, rules);
  const explanation = buildExplanation(calc, extraction);
  const assumptions = buildAssumptionsText(calc);

  return {
    reference: `SA-2025-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    household_context: extraction.household_context || '',
    appliances: extraction.appliances,
    ...calc,
    backup_hours_target: extraction.backup_hours || 0,
    assumptions,
    triggered_rules: triggered,
    explanation,
    trace,
    duration_ms,
    facts: workingFacts,
    created_at: new Date().toISOString(),
  };
}

export { extractRequirements, mergeExtractions };
