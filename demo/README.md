# Static demo (GitHub Pages)

This folder is the **browser-native build** of Solar Advisor, published to GitHub Pages so the
application has a live URL that requires no server.

## Is this the same expert system?

Yes. The rule engine, engineering formulas and NLP extractor are **ports of the Python modules** in
`../backend/app/expert_system/`, not reimplementations:

| Browser (`demo/src/engine/`) | Flask (`backend/app/expert_system/`) |
| --- | --- |
| `calculations.js` | `calculations.py` |
| `nlp.js` | `nlp.py` |
| `inference.js` (rules + explanations) | `inference_engine.py` + `explanation.py` |
| `../src/data/seed.json` | seeded `expert_rules`, `appliances`, `solar_panels`, `inverters`, `batteries`, `knowledge_facts` |

`seed.json` is exported from a freshly seeded database, so the demo evaluates the **real 11 rules**
against the **real equipment catalogue** and produces the same sizing the Flask API does.

## Parity is enforced by tests

```bash
npm test        # node --test src/engine/__tests__/parity.test.mjs
```

The suite pins the reference case — 4 fans, 8 LED lights, 1 refrigerator, 1 LED TV, 1 washing
machine, 8 h backup — and asserts the browser output equals the Python output exactly:

```
2,112 W connected load · 8,416 Wh/day · 2,640 W required inverter · 3 kW selected
3,156 Wp required → 6 × 550 W = 3,300 Wp · 51.2 V / 150 Ah · 7,680 Wh · ~8.2 h backup
rules fired: NLP-001, INV-002, PV-004, PV-006, BAT-003, BAT-007, SUR-005, ESS-008
```

It also checks the explanation strings match character-for-character, and that a missing backup
target stays `null` rather than being guessed. CI runs this before every publish.

## What is different from the full application

| Full app (Flask + SQLite) | This static demo |
| --- | --- |
| Accounts, login, roles | No accounts — single visitor workspace |
| Data persisted in SQLite | State lives in the browser tab; refresh clears it |
| Admin CRUD for facts/rules/equipment | Read-only knowledge base + rule inspector |
| Multi-user recommendations | One consultation at a time |

Those features require a server. They are fully implemented in the repository; deploy that with
`../DEPLOY.md` if you need them.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # → dist/
```
