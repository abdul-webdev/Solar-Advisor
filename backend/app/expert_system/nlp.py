"""Basic NLP requirement extraction: patterns + dictionary, no API key needed."""
import re

WORD_NUMBERS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "a": 1, "an": 1, "single": 1,
}

# Synonym -> canonical appliance name (must match appliances table names).
SYNONYMS = {
    "ceiling fan": "Ceiling fan", "fan": "Ceiling fan", "fans": "Ceiling fan",
    "standing fan": "Fan (standing)", "pedestal fan": "Fan (standing)",
    "led light": "LED light", "led lights": "LED light", "light": "LED light",
    "lights": "LED light", "bulb": "LED light", "bulbs": "LED light",
    "led bulb": "LED light", "led bulbs": "LED light", "tube light": "LED light",
    "refrigerator": "Refrigerator", "fridge": "Refrigerator", "freezer": "Freezer",
    "led tv": "LED television", "television": "LED television", "tv": "LED television",
    "washing machine": "Washing machine", "washer": "Washing machine",
    "air conditioner": "Air conditioner", "ac": "Air conditioner", "aircon": "Air conditioner",
    "microwave": "Microwave oven", "microwave oven": "Microwave oven",
    "kettle": "Electric kettle", "electric kettle": "Electric kettle",
    "iron": "Electric iron", "electric iron": "Electric iron",
    "water pump": "Water pump", "pump": "Water pump",
    "computer": "Computer", "pc": "Computer", "laptop": "Computer",
    "router": "Router / Wi-Fi", "wifi": "Router / Wi-Fi", "wi-fi": "Router / Wi-Fi",
    "water heater": "Water heater", "geyser": "Water heater",
    "dryer": "Clothes dryer", "clothes dryer": "Clothes dryer", "tumble dryer": "Clothes dryer",
    "oven": "Electric oven", "electric oven": "Electric oven",
    "rice cooker": "Rice cooker", "hair dryer": "Hair dryer",
    "lighting": "Lighting (general)",
}
# Longest-first so "led tv" wins over "tv", "washing machine" over "machine", etc.
SORTED_SYNONYMS = sorted(SYNONYMS.keys(), key=len, reverse=True)

BEDROOM_RE = re.compile(r"(\d+|one|two|three|four|five|six)[-\s]?bedroom", re.I)
BACKUP_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\s*(?:of\s*)?backup"
    r"|backup\s*(?:for\s*)?(?:around\s*|about\s*|approximately\s*|roughly\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)",
    re.I,
)
BACKUP_ONLY_RE = re.compile(r"^\s*(?:i need\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\s*(?:of\s*)?backup\s*$", re.I)
HOURS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:per\s*day|daily|a day|each day)", re.I)
SUN_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:peak\s*)?sun\s*hours?", re.I)
WATT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:watts?|w)\b", re.I)


def _parse_number(token):
    token = token.strip().lower()
    if token.isdigit():
        return int(token)
    try:
        return int(float(token))
    except ValueError:
        return WORD_NUMBERS.get(token)


def _quantity_before(text, start):
    """Look backwards from synonym start for a quantity (digit or word number)."""
    prefix = text[max(0, start - 30):start].strip()
    # e.g. "with 4 ", "and one ", "8 "
    m = re.search(r"(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)\s*$", prefix, re.I)
    if m:
        return _parse_number(m.group(1)) or 1
    # "x4" style or trailing digit separated by space already handled; default 1
    return 1


def extract_requirements(text, appliance_catalog):
    """Extract appliances, backup hours, bedrooms, sun hours from free text.

    appliance_catalog: list of dicts with name, wattage_w, typical_hours_per_day, is_essential.
    Returns dict with appliances list, backup_hours (or None), bedrooms, peak_sun_hours, raw matches.
    """
    if not text:
        return {"appliances": [], "backup_hours": None, "bedrooms": None,
                "peak_sun_hours": None, "household_context": "", "found": []}
    lower = text.lower()
    catalog = {a["name"].lower(): a for a in appliance_catalog}

    found = {}  # canonical name -> {quantity, spans}
    occupied = []  # (start, end) spans already claimed by longer synonyms
    for syn in SORTED_SYNONYMS:
        canonical = SYNONYMS[syn]
        if canonical.lower() not in catalog:
            continue
        for m in re.finditer(r"\b" + re.escape(syn) + r"\b", lower):
            s, e = m.span()
            if any(s < oe and e > os for os, oe in occupied):
                continue
            occupied.append((s, e))
            qty = _quantity_before(lower, s)
            if canonical in found:
                found[canonical]["quantity"] += qty
            else:
                found[canonical] = {"quantity": qty, "synonym": syn}

    appliances = []
    for canonical, info in found.items():
        base = catalog[canonical.lower()]
        appliances.append({
            "name": canonical,
            "quantity": info["quantity"],
            "wattage_w": base["wattage_w"],
            "hours_per_day": base["typical_hours_per_day"],
            "is_essential": base.get("is_essential", 1),
        })
    appliances.sort(key=lambda a: a["name"])

    backup_hours = None
    m = BACKUP_RE.search(text)
    if m:
        backup_hours = float(m.group(1) or m.group(2))
    else:
        m2 = BACKUP_ONLY_RE.search(text)
        if m2:
            backup_hours = float(m2.group(1))

    bedrooms = None
    bm = BEDROOM_RE.search(text)
    if bm:
        bedrooms = _parse_number(bm.group(1))

    sun = None
    sm = SUN_RE.search(text)
    if sm:
        try:
            sun = float(sm.group(1))
        except ValueError:
            sun = None

    context = ""
    if bedrooms:
        context = f"{bedrooms}-bedroom home"
    elif "house" in lower:
        context = "House"
    elif "apartment" in lower or "flat" in lower:
        context = "Apartment"
    elif "office" in lower:
        context = "Office"
    elif "shop" in lower or "business" in lower:
        context = "Small business"

    return {
        "appliances": appliances,
        "backup_hours": backup_hours,
        "bedrooms": bedrooms,
        "peak_sun_hours": sun,
        "household_context": context,
        "found": [a["name"] for a in appliances],
    }


def merge_extractions(existing_appliances, new_appliances):
    """Merge two appliance lists by name (new quantities replace/add)."""
    merged = {a["name"]: dict(a) for a in existing_appliances}
    for a in new_appliances:
        if a["name"] in merged:
            merged[a["name"]]["quantity"] = a["quantity"]
            merged[a["name"]]["hours_per_day"] = a["hours_per_day"]
        else:
            merged[a["name"]] = dict(a)
    return sorted(merged.values(), key=lambda x: x["name"])


def detect_intent(text):
    t = (text or "").lower()
    if any(w in t for w in ["explain", "why", "how does", "how do you", "reasoning"]):
        return "explain"
    if any(w in t for w in ["battery", "batteries", "storage"]):
        return "battery"
    if any(w in t for w in ["panel", "solar array", "pv"]):
        return "panel"
    if any(w in t for w in ["inverter"]):
        return "inverter"
    if t.strip() in ("hi", "hello", "hey", "salam", "aoa") or t.startswith(("hi ", "hello ", "hey ")):
        return "greeting"
    if any(w in t for w in ["thank", "shukriya"]):
        return "thanks"
    if any(w in t for w in ["essential", "only", "exclude", "without"]):
        return "essential"
    return "requirements"
