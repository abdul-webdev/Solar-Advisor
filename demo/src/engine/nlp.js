/**
 * Requirement extraction — browser port of backend/app/expert_system/nlp.py.
 * Pattern + dictionary based; no API key and no network call.
 */

const WORD_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1, single: 1,
};

export const SYNONYMS = {
  'ceiling fan': 'Ceiling fan', fan: 'Ceiling fan', fans: 'Ceiling fan',
  'standing fan': 'Fan (standing)', 'pedestal fan': 'Fan (standing)',
  'led light': 'LED light', 'led lights': 'LED light', light: 'LED light',
  lights: 'LED light', bulb: 'LED light', bulbs: 'LED light',
  'led bulb': 'LED light', 'led bulbs': 'LED light', 'tube light': 'LED light',
  refrigerator: 'Refrigerator', fridge: 'Refrigerator', freezer: 'Freezer',
  'led tv': 'LED television', television: 'LED television', tv: 'LED television',
  'washing machine': 'Washing machine', washer: 'Washing machine',
  'air conditioner': 'Air conditioner', ac: 'Air conditioner', aircon: 'Air conditioner',
  microwave: 'Microwave oven', 'microwave oven': 'Microwave oven',
  kettle: 'Electric kettle', 'electric kettle': 'Electric kettle',
  iron: 'Electric iron', 'electric iron': 'Electric iron',
  'water pump': 'Water pump', pump: 'Water pump',
  computer: 'Computer', pc: 'Computer', laptop: 'Computer',
  router: 'Router / Wi-Fi', wifi: 'Router / Wi-Fi', 'wi-fi': 'Router / Wi-Fi',
  'water heater': 'Water heater', geyser: 'Water heater',
  dryer: 'Clothes dryer', 'clothes dryer': 'Clothes dryer', 'tumble dryer': 'Clothes dryer',
  oven: 'Electric oven', 'electric oven': 'Electric oven',
  'rice cooker': 'Rice cooker', 'hair dryer': 'Hair dryer',
  lighting: 'Lighting (general)',
};

const SORTED_SYNONYMS = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);

const BEDROOM_RE = /(\d+|one|two|three|four|five|six)[-\s]?bedroom/i;
const BACKUP_RE = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\s*(?:of\s*)?backup|backup\s*(?:for\s*)?(?:around\s*|about\s*|approximately\s*|roughly\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/i;
const BACKUP_ONLY_RE = /^\s*(?:i need\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\s*(?:of\s*)?backup\s*$/i;
const SUN_RE = /(\d+(?:\.\d+)?)\s*(?:peak\s*)?sun\s*hours?/i;

function parseNumber(token) {
  const t = String(token).trim().toLowerCase();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const f = parseFloat(t);
  if (!Number.isNaN(f)) return Math.trunc(f);
  return WORD_NUMBERS[t];
}

function quantityBefore(text, start) {
  const prefix = text.slice(Math.max(0, start - 30), start).trim();
  const m = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)\s*$/i.exec(prefix);
  if (m) return parseNumber(m[1]) || 1;
  return 1;
}

export function extractRequirements(text, applianceCatalog) {
  const empty = { appliances: [], backup_hours: null, bedrooms: null, peak_sun_hours: null,
    household_context: '', found: [] };
  if (!text) return empty;

  const lower = text.toLowerCase();
  const catalog = {};
  for (const a of applianceCatalog) catalog[a.name.toLowerCase()] = a;

  const found = {};
  const occupied = [];
  for (const syn of SORTED_SYNONYMS) {
    const canonical = SYNONYMS[syn];
    if (!catalog[canonical.toLowerCase()]) continue;
    const re = new RegExp(`\\b${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let m;
    while ((m = re.exec(lower)) !== null) {
      const s = m.index;
      const e = s + m[0].length;
      if (occupied.some(([os, oe]) => s < oe && e > os)) continue;
      occupied.push([s, e]);
      const qty = quantityBefore(lower, s);
      if (found[canonical]) found[canonical].quantity += qty;
      else found[canonical] = { quantity: qty, synonym: syn };
    }
  }

  const appliances = Object.entries(found).map(([canonical, info]) => {
    const base = catalog[canonical.toLowerCase()];
    return {
      name: canonical,
      quantity: info.quantity,
      wattage_w: base.wattage_w,
      hours_per_day: base.typical_hours_per_day,
      is_essential: base.is_essential ?? 1,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  let backupHours = null;
  let m = BACKUP_RE.exec(text);
  if (m) backupHours = parseFloat(m[1] || m[2]);
  else {
    const m2 = BACKUP_ONLY_RE.exec(text);
    if (m2) backupHours = parseFloat(m2[1]);
  }

  let bedrooms = null;
  const bm = BEDROOM_RE.exec(text);
  if (bm) bedrooms = parseNumber(bm[1]);

  let sun = null;
  const sm = SUN_RE.exec(text);
  if (sm) {
    const v = parseFloat(sm[1]);
    if (!Number.isNaN(v)) sun = v;
  }

  let context = '';
  if (bedrooms) context = `${bedrooms}-bedroom home`;
  else if (lower.includes('house')) context = 'House';
  else if (lower.includes('apartment') || lower.includes('flat')) context = 'Apartment';
  else if (lower.includes('office')) context = 'Office';
  else if (lower.includes('shop') || lower.includes('business')) context = 'Small business';

  return {
    appliances,
    backup_hours: backupHours,
    bedrooms,
    peak_sun_hours: sun,
    household_context: context,
    found: appliances.map((a) => a.name),
  };
}

export function mergeExtractions(existing, incoming) {
  const merged = {};
  for (const a of existing) merged[a.name] = { ...a };
  for (const a of incoming) {
    if (merged[a.name]) {
      merged[a.name].quantity = a.quantity;
      merged[a.name].hours_per_day = a.hours_per_day;
    } else merged[a.name] = { ...a };
  }
  return Object.values(merged).sort((a, b) => a.name.localeCompare(b.name));
}

export function detectIntent(text) {
  const t = (text || '').toLowerCase();
  if (['explain', 'why', 'how does', 'how do you', 'reasoning'].some((w) => t.includes(w))) return 'explain';
  if (['battery', 'batteries', 'storage'].some((w) => t.includes(w))) return 'battery';
  if (['panel', 'solar array', 'pv'].some((w) => t.includes(w))) return 'panel';
  if (t.includes('inverter')) return 'inverter';
  const s = t.trim();
  if (['hi', 'hello', 'hey', 'salam', 'aoa'].includes(s) || /^(hi|hello|hey)\s/.test(s)) return 'greeting';
  if (['thank', 'shukriya'].some((w) => t.includes(w))) return 'thanks';
  if (['essential', 'only', 'exclude', 'without'].some((w) => t.includes(w))) return 'essential';
  return 'requirements';
}
