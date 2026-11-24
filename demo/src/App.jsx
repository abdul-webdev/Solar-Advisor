import { useEffect, useMemo, useState } from 'react';
import {
  Sun, Bot, Paperclip, Send, Plus, Trash2, Check, Circle, Loader2, Sparkles,
  MessageSquare, FileText, BookOpen, FlaskConical, ArrowRight, ArrowLeft, Download, Info, Github,
} from 'lucide-react';
import { extractRequirements, mergeExtractions, generateRecommendation, catalog, facts, rules, equipment, settings } from './engine/advisor.js';
import { Card, Modal, RecommendationCards, Explanation, TraceTable, LoadChart, kwh, ONE, n0 } from './components/Shared.jsx';

const EXAMPLE = 'I have a two-bedroom house with 4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine. I need backup for around 8 hours. What solar system do you recommend?';
const STEPS = ['Appliances and backup target extracted', 'Approved technical facts retrieved', 'Applying inverter, PV and battery rules…', 'Preparing a transparent explanation'];

const NAV = [
  { id: 'advisor', label: 'Chat Advisor', icon: MessageSquare },
  { id: 'report', label: 'Recommendation report', icon: FileText },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'rules', label: 'Rule inspector', icon: FlaskConical },
];

function Sidebar({ view, setView, rec }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-navy lg:flex">
      <div className="px-6 pb-2 pt-6">
        <div className="flex items-center gap-2.5">
          <Sun className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-white">Solar Advisor</span>
        </div>
        <p className="mt-1.5 text-[13px] text-slate-400">Ask. Plan. Go Solar.</p>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
      </div>
      <nav className="mt-3 flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
              view === item.id ? 'bg-primary text-white' : 'text-slate-300 hover:bg-navy2 hover:text-white'}`}>
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mx-4 mb-4 rounded-xl bg-navy2 p-4">
        <p className="text-[13px] font-semibold text-white">Static demo · GitHub Pages</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          The expert system runs entirely in your browser. Same formulas, rules and traces as the Flask service.
        </p>
      </div>
      <div className="border-t border-navy2 px-6 py-4">
        <p className="truncate text-sm font-semibold text-white">Demo visitor</p>
        <p className="text-xs text-slate-400">{rec ? `Last report ${rec.reference}` : 'No consultation yet'}</p>
        <a href="https://github.com/abdul-webdev/Solar-Advisor" target="_blank" rel="noreferrer"
           className="mt-3 flex items-center gap-2 text-[13px] text-slate-300 hover:text-white">
          <Github className="h-4 w-4" /> Full-stack source
        </a>
      </div>
    </aside>
  );
}

function Advisor({ messages, send, input, setInput, busy, rec }) {
  const bottom = useMemo(() => messages.length + (busy ? 1 : 0), [messages, busy]);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-[560px] flex-col rounded-2xl border border-line bg-white shadow-card">
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-8">
          {messages.length === 0 && !busy && (
            <div className="fade-up">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lightblue">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">Solar Advisor</p>
                  <h2 className="mt-1 text-2xl font-bold text-navy">Let&apos;s design energy around your life.</h2>
                  <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted">
                    Tell me which appliances you use, how long you use them, and how many hours of backup you need. I&apos;ll explain every recommendation.
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-line bg-appbg p-5 sm:ml-[52px]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Try describing your home</p>
                <p className="mt-2 text-[15px] leading-relaxed text-navy">“{EXAMPLE}”</p>
              </div>
              <button onClick={() => send(EXAMPLE)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark sm:ml-[52px]">
                Use this example <ArrowRight className="h-4 w-4" />
              </button>
              <div className="mt-8 sm:ml-[52px]">
                <p className="text-[15px] font-semibold text-navy">Missing something? I&apos;ll ask, not guess.</p>
                <p className="mt-1 text-sm text-muted">
                  For example: “Should the washing machine run during a power outage, or can I size backup for essential appliances only?”
                </p>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="fade-up">
              {m.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-lightblue px-5 py-3.5 text-[15px] leading-relaxed text-navy sm:max-w-[70%]">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lightblue">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-navy">Solar Advisor</p>
                  </div>
                  <div className="mt-3 sm:ml-[52px]">
                    <p className="text-[15px] leading-relaxed text-navy">{m.content}</p>
                    {m.questions?.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {m.questions.map((q, qi) => (
                          <p key={qi} className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Sparkles className="h-4 w-4" /> {q}
                          </p>
                        ))}
                      </div>
                    )}
                    {m.rec && (
                      <div className="mt-5">
                        <RecommendationCards rec={m.rec} />
                        <Explanation rec={m.rec} />
                        <p className="mt-3 text-xs leading-relaxed text-muted">
                          ¹ Typical duty cycles assumed. ² Essential load only; heavy loads excluded during outages.
                          Confirm appliance hours and start-up surge before equipment selection.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div className="fade-up rounded-xl border border-line bg-appbg p-6">
              <h4 className="text-lg font-bold text-navy">Analyzing your energy requirements</h4>
              <div className="mt-4 space-y-2.5">
                {STEPS.map((step, i) => (
                  <p key={step} className="flex items-center gap-2.5 text-sm text-navy">
                    {i < 2 ? <Check className="h-4 w-4 text-success" />
                      : i === 2 ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      : <Circle className="h-4 w-4 text-slate-300" />}
                    {step}
                  </p>
                ))}
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="progress-slide h-full rounded-full bg-primary" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 py-4 sm:px-6">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5">
            <Paperclip className="h-5 w-5 shrink-0 text-muted" />
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
              placeholder="Describe your electricity requirements in natural language…"
              className="min-w-0 flex-1 border-0 text-[15px]" style={{ boxShadow: 'none' }} />
            <button type="submit" disabled={busy || !input.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark disabled:opacity-50">
              {busy ? 'Calculating…' : <>Send message <Send className="h-4 w-4" /></>}
            </button>
          </form>
          <p className="mt-2 text-center text-[13px] text-primary">Would you like me to explain any component in more detail?</p>
        </div>
      </div>

      <div className="space-y-5">
        <Card>
          <h3 className="text-[15px] font-bold text-navy">Your energy brief</h3>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {rec?.household_context || 'Two-bedroom home'}
          </p>
          <div className="mt-4 space-y-3">
            {(rec?.appliances || catalog.filter((a) => ['Ceiling fan', 'LED light', 'Refrigerator', 'LED television', 'Washing machine'].includes(a.name)).map((a) => ({
              name: a.name,
              quantity: a.name === 'Ceiling fan' ? 4 : a.name === 'LED light' ? 8 : 1,
              wattage_w: a.wattage_w,
            }))).map((a) => (
              <div key={a.name} className="flex justify-between text-sm">
                <span className="text-navy">{a.quantity} × {a.name}</span>
                <span className="font-medium text-navy">{n0(a.quantity * a.wattage_w)} W</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Connected load</span>
              <span className="text-base font-bold text-navy">{rec ? `${n0(rec.total_load_w)} W` : '2,112 W'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Backup target</span>
              <span className="text-base font-bold text-navy">{rec ? `${ONE(rec.backup_hours_target)} hours` : '8 hours'}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Nameplate values assumed. Confirm to refine.</p>
        </Card>
        <div className="rounded-2xl bg-lightblue p-5">
          <h3 className="text-[15px] font-bold text-navy">A plan you can understand</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-navy">
            <li>• {ONE(settings.peak_sun_hours)} peak sun hours / day</li>
            <li>• {Math.round(parseFloat(settings.pv_performance_ratio) * 100)}% PV performance ratio</li>
            <li>• {Math.round(parseFloat(settings.battery_dod) * 100)}% battery depth of discharge</li>
            <li>• {Math.round(parseFloat(settings.inverter_efficiency) * 100)}% inverter efficiency</li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Preliminary sizing, not an installation design. An engineer must verify surge, wiring and site conditions.
          </p>
        </div>
      </div>
    </div>
  );
}

function Report({ rec, onBack, onTrace }) {
  const [ready, setReady] = useState(false);
  if (!rec) {
    return (
      <Card className="text-center">
        <p className="text-base font-semibold text-navy">No report yet</p>
        <p className="mt-1 text-sm text-muted">Generate a consultation in the Chat Advisor first.</p>
      </Card>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-[28px]">{rec.household_context || 'Home solar plan'}</h1>
          <p className="mt-1 text-sm text-muted">
            Recommendation report · #{rec.reference} · Generated {new Date(rec.created_at).toLocaleString()}
          </p>
        </div>
        <button onClick={() => setReady(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark">
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-success">
        <Check className="h-4 w-4 shrink-0" />
        Your {ONE(rec.backup_hours_target)}-hour essential backup target is{' '}
        {rec.estimated_backup_hours >= rec.backup_hours_target ? 'met' : 'close to being met'} under the stated assumptions.
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { v: `${(rec.pv_capacity_wp / 1000).toFixed(1)} kWp`, l: `PV array · ${rec.pv_panel_count} × ${ONE(rec.pv_panel_wattage_w)} W` },
          { v: `${ONE(rec.inverter_capacity_kw)} kW`, l: 'Continuous inverter' },
          { v: `${kwh(rec.battery_energy_wh)} kWh`, l: `Storage · ${ONE(rec.battery_voltage_v)} V / ${ONE(rec.battery_capacity_ah)} Ah` },
          { v: `~${ONE(rec.estimated_backup_hours)} h`, l: `Backup at ${n0(rec.essential_load_w)} W essential` },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="text-2xl font-bold text-navy">{c.v}</p>
            <p className="mt-1 text-xs text-muted">{c.l}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <h3 className="text-lg font-bold text-navy">Sizing calculations &amp; applied rules</h3>
            <div className="mt-3 rounded-xl bg-appbg p-4">
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-navy">{rec.explanation}</pre>
            </div>
            <button onClick={onTrace} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Inspect the full inference trace <ArrowRight className="h-4 w-4" />
            </button>
          </Card>
          <Card>
            <h3 className="text-lg font-bold text-navy">Appliance load breakdown</h3>
            <div className="mt-4"><LoadChart rec={rec} /></div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                    <th className="py-2 pr-4 font-semibold">Appliance</th>
                    <th className="py-2 pr-4 font-semibold">Qty</th>
                    <th className="py-2 pr-4 font-semibold">Wattage</th>
                    <th className="py-2 pr-4 font-semibold">Hours/day</th>
                    <th className="py-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.appliances.map((a) => (
                    <tr key={a.name} className="border-b border-line/60">
                      <td className="py-2.5 pr-4 text-navy">{a.name}</td>
                      <td className="py-2.5 pr-4 text-navy">{a.quantity}</td>
                      <td className="py-2.5 pr-4 text-navy">{a.wattage_w} W</td>
                      <td className="py-2.5 pr-4 text-navy">{a.hours_per_day} h</td>
                      <td className="py-2.5 font-medium text-navy">{n0(a.quantity * a.wattage_w)} W</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <h3 className="text-lg font-bold text-navy">Design assumptions</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              {rec.assumptions.map((a) => <li key={a}>• {a}</li>)}
            </ul>
          </Card>
          <div className="rounded-2xl bg-lightblue p-6">
            <h3 className="text-[15px] font-bold text-navy">Before installation</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy">
              Confirm appliance run times, refrigerator start-up surge, roof shading, local irradiance and equipment
              voltage compatibility. A qualified installer must verify protection devices, cable sizing, earthing and
              applicable electrical standards.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-appbg">
          <ArrowLeft className="h-4 w-4" /> Back to chatbot
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark">
          Print / save as PDF <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <Modal open={ready} title="Your report is ready" onClose={() => setReady(false)}
        message={`${rec.reference} · ${rec.household_context || 'Home'} — the report includes requirements, sizing calculations, expert rules and planning assumptions. Use your browser's print dialog to save it as a PDF.`} />
    </div>
  );
}

function Knowledge() {
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const cats = [...new Set(facts.map((f) => f.category))].sort();
  const list = facts.filter((f) =>
    (!cat || f.category === cat) &&
    (!q || `${f.title} ${f.description} ${f.fact_code}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Knowledge Base</h1>
      <p className="mt-1 text-[15px] text-muted">
        The approved facts below are the ones the expert system reasons with — {facts.length} records, read-only in this demo.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search knowledge…"
          className="min-w-[240px] flex-1 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((f) => (
          <Card key={f.fact_code} className="!p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-lightblue px-2.5 py-1 text-xs font-semibold text-primary">{f.category}</span>
              <span className="text-xs font-medium text-muted">{f.fact_code}</span>
            </div>
            <h3 className="mt-3 text-[15px] font-bold text-navy">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.description}</p>
            {f.value_text && <p className="mt-3 rounded-lg bg-appbg px-3 py-2 text-[13px] font-medium text-navy">{f.value_text}</p>}
          </Card>
        ))}
        {!list.length && <p className="py-8 text-center text-sm text-muted">No facts match that search.</p>}
      </div>
    </div>
  );
}

function RuleInspector({ rec }) {
  const [text, setText] = useState(EXAMPLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function run(e) {
    e.preventDefault();
    setError(''); setResult(null);
    const ext = extractRequirements(text, catalog);
    if (!ext.appliances.length) {
      setError('No appliances could be extracted. Try listing appliances with quantities, e.g. "4 fans and 8 lights".');
      return;
    }
    const backup = ext.backup_hours ?? 8;
    const defaulted = ext.backup_hours == null;
    setResult({ ext, rec: generateRecommendation({ ...ext, backup_hours: backup }), defaulted });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Rule inspector</h1>
        <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Sandbox · runs in your browser</span>
      </div>
      <p className="mt-1 text-[15px] text-muted">
        Inspect extraction, intermediate calculations and every rule the engine evaluates — {rules.length} rules in the active set.
      </p>

      <form onSubmit={run} className="mt-5">
        <Card>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Sample user requirements</span>
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm" />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark">
              Run inference engine
            </button>
            <button type="button" onClick={() => setText(EXAMPLE)} className="text-sm font-semibold text-primary hover:underline">Load example</button>
            {result && <span className="text-sm text-muted">Completed in {result.rec.duration_ms} ms</span>}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {result?.defaulted && (
            <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
              No backup target was found in the text, so this test run uses an 8-hour default.
            </p>
          )}
        </Card>
      </form>

      {result && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="space-y-5">
            <Card>
              <h3 className="text-lg font-bold text-navy">Extracted facts</h3>
              <p className="text-xs text-muted">{result.ext.appliances.length} appliance categories · {ONE(result.ext.backup_hours ?? 8)} h target</p>
              <div className="mt-3 space-y-2">
                {result.ext.appliances.map((a) => (
                  <div key={a.name} className="flex justify-between text-sm">
                    <span className="text-navy">{a.name}</span>
                    <span className="text-muted">{a.quantity} × {a.wattage_w} W</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Connected load</span><span className="font-semibold text-navy">{n0(result.rec.total_load_w)} W</span></div>
                <div className="flex justify-between"><span className="text-muted">Daily energy</span><span className="font-semibold text-navy">{kwh(result.rec.daily_energy_wh)} kWh</span></div>
                <div className="flex justify-between"><span className="text-muted">Essential load</span><span className="font-semibold text-navy">{n0(result.rec.essential_load_w)} W</span></div>
              </div>
            </Card>
            <div className="rounded-2xl bg-navy p-6 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Final recommendation</p>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-300">Solar array</span><span className="font-bold">{(result.rec.pv_capacity_wp / 1000).toFixed(1)} kWp</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Inverter</span><span className="font-bold">{ONE(result.rec.inverter_capacity_kw)} kW / {ONE(result.rec.battery_voltage_v)} V</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Battery bank</span><span className="font-bold">{kwh(result.rec.battery_energy_wh)} kWh</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Usable backup</span><span className="font-bold">~{ONE(result.rec.estimated_backup_hours)} h</span></div>
              </div>
            </div>
          </div>
          <Card>
            <h3 className="text-lg font-bold text-navy">Inference execution trace</h3>
            <p className="text-xs text-muted">
              {result.rec.trace.length} rules evaluated · {result.rec.triggered_rules.length} triggered · {result.rec.duration_ms} ms
            </p>
            <div className="mt-4"><TraceTable trace={result.rec.trace} /></div>
          </Card>
        </div>
      )}

      {!result && (
        <div className="mt-5 rounded-2xl bg-lightblue p-6">
          <div className="flex gap-2">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-navy">
              This sandbox is the same engine the advisor uses. Run it to see which of the {rules.length} database rules
              fire, in priority order, and the exact formula each one applied.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('advisor');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(null);
  const [lastExtract, setLastExtract] = useState(null);

  function send(text) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setBusy(true);

    setTimeout(() => {
      const intent = (() => {
        const t = message.toLowerCase();
        if (['hi', 'hello', 'hey'].includes(t.trim())) return 'greeting';
        if (['thank', 'thanks'].some((w) => t.includes(w))) return 'thanks';
        return 'requirements';
      })();

      if (intent === 'greeting') {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `Hello! I'm the Solar Advisor. Describe your household appliances and how many hours of backup you need — for example: "${EXAMPLE}"`,
        }]);
        setBusy(false);
        return;
      }
      if (intent === 'thanks') {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: "You're welcome! Describe another home whenever you're ready, or open the Rule inspector to see the reasoning.",
        }]);
        setBusy(false);
        return;
      }

      const history = messages.filter((m) => m.role === 'user').map((m) => m.content);
      let appliances = [];
      let backup = null;
      let context = '';
      for (const text of [...history, message]) {
        const ext = extractRequirements(text, catalog);
        appliances = mergeExtractions(appliances, ext.appliances);
        if (ext.backup_hours != null) backup = ext.backup_hours;
        if (ext.household_context) context = ext.household_context;
      }

      if (!appliances.length) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: "I couldn't identify any appliances in that message. Please list what you use — for example: \"4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine.\"",
          questions: ['Which appliances do you use, and how many of each?'],
        }]);
        setBusy(false);
        return;
      }

      if (backup == null) {
        const names = appliances.map((a) => `${a.quantity} × ${a.name}`).join(', ');
        setLastExtract({ appliances, backup_hours: null, household_context: context });
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `Thanks — I've noted: ${names}. Before I size the system, how many hours of backup do you need during a power outage? For example, reply "8 hours of backup". I won't guess this value.`,
          questions: ['How many hours of backup do you need?'],
        }]);
        setBusy(false);
        return;
      }

      const recommendation = generateRecommendation({ appliances, backup_hours: backup, household_context: context });
      setRec(recommendation);
      const met = recommendation.estimated_backup_hours >= backup ? 'meets' : 'is close to';
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Thank you! I've analyzed your appliance requirements and calculated a suitable solar configuration. ` +
          `Your connected load is ${n0(recommendation.total_load_w)} W with estimated daily energy of ${kwh(recommendation.daily_energy_wh)} kWh. ` +
          `I recommend a ${ONE(recommendation.inverter_capacity_kw)} kW inverter, a ${n0(recommendation.pv_capacity_wp)} Wp solar array ` +
          `(${recommendation.pv_panel_count} × ${ONE(recommendation.pv_panel_wattage_w)} W panels) and a ` +
          `${ONE(recommendation.battery_voltage_v)} V / ${ONE(recommendation.battery_capacity_ah)} Ah battery ` +
          `(${kwh(recommendation.battery_energy_wh)} kWh). Estimated backup is ~${ONE(recommendation.estimated_backup_hours)} hours ` +
          `on essential loads, which ${met} your ${ONE(backup)}-hour target.`,
        rec: recommendation,
      }]);
      setBusy(false);
    }, 900);
  }

  function clearChat() {
    setMessages([]); setRec(null); setInput(''); setLastExtract(null);
  }

  return (
    <div className="flex min-h-screen bg-appbg">
      <Sidebar view={view} setView={setView} rec={rec} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2 text-[13px]">
            <Sun className="h-5 w-5 text-primary lg:hidden" />
            <span className="font-medium uppercase tracking-wide text-muted">Home energy</span>
            <span className="text-muted">/</span>
            <span className="font-medium text-navy">{NAV.find((n) => n.id === view)?.label}</span>
          </div>
          <span className="flex items-center gap-2 text-[13px] font-medium text-success">
            <span className="h-2 w-2 rounded-full bg-success" /> Expert system online
          </span>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-8">
          {view === 'advisor' && (
            <div>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Solar Microgrid &amp; Home Inverter Expert Advisor</h1>
                  <p className="mt-1 text-[15px] text-muted">Your conversational expert system for smart and sustainable energy solutions.</p>
                </div>
                <button onClick={clearChat} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-appbg">
                  <Trash2 className="h-4 w-4" /> Clear chat
                </button>
              </div>
              <Advisor messages={messages} send={send} input={input} setInput={setInput} busy={busy} rec={rec} />
            </div>
          )}
          {view === 'report' && <Report rec={rec} onBack={() => setView('advisor')} onTrace={() => setView('rules')} />}
          {view === 'knowledge' && <Knowledge />}
          {view === 'rules' && <RuleInspector rec={rec} />}
        </main>

        <footer className="px-4 pb-6 text-xs text-muted sm:px-8">
          Solar Advisor supports planning decisions. Always consult a qualified solar installer. ·
          Static demo on GitHub Pages — the full Flask + SQLite application is in the repository.
        </footer>
      </div>
    </div>
  );
}
