import { useEffect, useRef, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Bot, Paperclip, Send, Plus, Trash2, ArrowRight, Check, Circle, Loader2, Sparkles } from 'lucide-react';
import { get, post, del } from '../services/api';

const EXAMPLE = 'I have a two-bedroom house with 4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine. I need backup for around 8 hours. What solar system do you recommend?';

const ANALYZE_STEPS = [
  'Appliances and backup target extracted',
  'Approved technical facts retrieved',
  'Applying inverter, PV and battery rules…',
  'Preparing a transparent explanation',
];

function RecommendationCard({ rec }) {
  const cards = [
    { value: `${(rec.total_load_w / 1000).toFixed(2)} kW`, label: 'Connected load' },
    { value: `${rec.daily_energy_kwh.toFixed(2)} kWh`, label: 'Daily energy¹' },
    { value: `${rec.inverter_capacity_kw} kW`, label: 'Inverter capacity' },
    { value: `${(rec.pv_capacity_wp / 1000).toFixed(1)} kWp`, label: `Solar array · ${rec.pv_panel_count} × ${rec.pv_panel_wattage_w} W` },
    { value: `${(rec.battery_energy_wh / 1000).toFixed(2)} kWh`, label: `Battery · ${rec.battery_voltage_v} V / ${rec.battery_capacity_ah} Ah` },
    { value: `~${rec.estimated_backup_hours} hours`, label: 'Essential-load backup²' },
  ];
  const whyLines = (rec.explanation || '').split('\n').filter(Boolean);
  return (
    <div className="fade-up">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-appbg px-4 py-3.5">
            <p className="text-xl font-bold text-navy">{c.value}</p>
            <p className="mt-0.5 text-xs text-muted">{c.label}</p>
          </div>
        ))}
      </div>
      <h4 className="mt-6 text-[15px] font-bold text-navy">Why These Recommendations?</h4>
      <div className="mt-2 space-y-1.5">
        {whyLines.map((line, i) => (
          <p key={i} className="text-[13px] leading-relaxed text-muted">{line}</p>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        ¹ Typical duty cycles assumed. ² Essential load only; heavy loads excluded during outages.
        Confirm appliance hours and start-up surge before equipment selection.
      </p>
      {rec.triggered_rules?.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Expert rules applied: <span className="font-semibold text-navy">{rec.triggered_rules.join(' · ')}</span>
        </p>
      )}
    </div>
  );
}

function EnergyBrief({ brief, rec }) {
  const apps = rec?.appliances || brief?.appliances || [];
  const total = rec?.total_load_w ?? brief?.total_load_w;
  const backup = rec?.backup_hours_target ?? brief?.backup_hours;
  const title = rec?.household_context || brief?.household_context || 'Your home';
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h3 className="text-[15px] font-bold text-navy">{rec ? 'Your energy brief' : 'Example energy brief'}</h3>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{title || 'Two-bedroom home'}</p>
      <div className="mt-4 space-y-3">
        {apps.length === 0 && (
          <>
            <div className="flex justify-between text-sm"><span className="text-navy">4 ceiling fans</span><span className="font-medium text-navy">300 W</span></div>
            <div className="flex justify-between text-sm"><span className="text-navy">8 LED lights</span><span className="font-medium text-navy">72 W</span></div>
            <div className="flex justify-between text-sm"><span className="text-navy">1 refrigerator</span><span className="font-medium text-navy">200 W</span></div>
            <div className="flex justify-between text-sm"><span className="text-navy">1 LED television</span><span className="font-medium text-navy">100 W</span></div>
            <div className="flex justify-between text-sm"><span className="text-navy">1 washing machine</span><span className="font-medium text-navy">1,440 W</span></div>
          </>
        )}
        {apps.map((a) => (
          <div key={a.name} className="flex justify-between text-sm">
            <span className="text-navy">{a.quantity} × {a.name}</span>
            <span className="font-medium text-navy">{(a.quantity * a.wattage_w).toLocaleString()} W</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t border-line pt-4">
        <div className="flex justify-between text-sm"><span className="text-muted">Connected load</span><span className="text-base font-bold text-navy">{total ? `${Number(total).toLocaleString()} W` : '2,112 W'}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted">Backup target</span><span className="text-base font-bold text-navy">{backup ? `${backup} hours` : '8 hours'}</span></div>
      </div>
      <p className="mt-3 text-xs text-muted">Nameplate values assumed. Confirm to refine.</p>
    </div>
  );
}

export default function ChatAdvisor() {
  const { setCrumb } = useOutletContext();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]); // {role, content, rec?, questions?}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [brief, setBrief] = useState(null);
  const [lastRec, setLastRec] = useState(null);
  const [consultation, setConsultation] = useState('SA-2025-042');
  const scrollRef = useRef(null);

  useEffect(() => { setCrumb('Chat Advisor'); }, [setCrumb]);

  useEffect(() => {
    get('/chat/history')
      .then((d) => {
        if (d.messages?.length) {
          setMessages(d.messages.map((m) => ({ role: m.role, content: m.content })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setError('');
    setInput('');
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const d = await post('/chat', { message, history });
      if (d.brief) setBrief(d.brief);
      if (d.recommendation) {
        setLastRec(d.recommendation);
        setConsultation(d.recommendation.reference);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: d.reply, rec: d.recommendation, questions: d.questions }]);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry — ${err.message} Please try again.` }]);
    } finally {
      setBusy(false);
    }
  }

  async function newConsultation() {
    try { await del('/chat/history'); } catch { /* ignore */ }
    setMessages([]);
    setBrief(null);
    setLastRec(null);
    setConsultation('SA-2025-' + Math.floor(100 + Math.random() * 900));
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Solar Microgrid &amp; Home Inverter Expert Advisor</h1>
          <p className="mt-1 text-[15px] text-muted">Your conversational expert system for smart and sustainable energy solutions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={newConsultation} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-appbg">
            <Plus className="h-4 w-4" /> New consultation
          </button>
          <button onClick={newConsultation} title="Clear chat" className="rounded-lg border border-line bg-white p-2.5 text-muted hover:bg-appbg">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Consultation #{consultation}</p>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Chat card */}
        <div className="flex min-h-[520px] flex-col rounded-2xl border border-line bg-white shadow-card">
          <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-8">
            <p className="text-center text-xs text-muted">Today, {today}</p>

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
                <div className="ml-0 mt-6 rounded-xl border border-line bg-appbg p-5 sm:ml-[52px]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Try describing your home</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-navy">“{EXAMPLE}”</p>
                </div>
                <button onClick={() => send(EXAMPLE)} className="ml-0 mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark sm:ml-[52px]">
                  Use this example <ArrowRight className="h-4 w-4" />
                </button>
                <div className="mt-8 sm:ml-[52px]">
                  <p className="text-[15px] font-semibold text-navy">Missing something? I&apos;ll ask, not guess.</p>
                  <p className="mt-1 text-sm text-muted">For example: “Should the washing machine run during a power outage, or can I size backup for essential appliances only?”</p>
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
                          <RecommendationCard rec={m.rec} />
                          <div className="mt-5 flex flex-wrap gap-3">
                            <button onClick={() => navigate(`/recommendations/${m.rec.id}`)}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark">
                              View full report <ArrowRight className="h-4 w-4" />
                            </button>
                            <button onClick={() => navigate('/recommendations')}
                              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-appbg">
                              My Recommendations
                            </button>
                          </div>
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
                  {ANALYZE_STEPS.map((step, i) => (
                    <p key={step} className="flex items-center gap-2.5 text-sm text-navy">
                      {i < 2 ? <Check className="h-4 w-4 text-success" /> : i === 2 ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Circle className="h-4 w-4 text-slate-300" />}
                      {step}
                    </p>
                  ))}
                </div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="progress-slide h-full rounded-full bg-primary" />
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                  <span className="flex gap-1">
                    <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Solar Advisor is calculating…
                </p>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="border-t border-line px-4 py-4 sm:px-6">
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5"
            >
              <Paperclip className="h-5 w-5 shrink-0 text-muted" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your electricity requirements in natural language…"
                className="min-w-0 flex-1 border-0 text-[15px] shadow-none focus:shadow-none"
                style={{ boxShadow: 'none' }}
                disabled={busy}
              />
              <button type="submit" disabled={busy || !input.trim()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark disabled:opacity-50">
                {busy ? 'Calculating…' : <>Send message <Send className="h-4 w-4" /></>}
              </button>
            </form>
            <p className="mt-2 text-center text-[13px] text-primary">Would you like me to explain any component in more detail?</p>
            <p className="mt-1 text-center text-xs text-muted">Press Enter to send · Your consultation is private</p>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <EnergyBrief brief={brief} rec={lastRec} />
          <div className="rounded-2xl bg-lightblue p-5">
            <h3 className="text-[15px] font-bold text-navy">A plan you can understand</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-navy">
              <li>• 4 peak sun hours / day</li>
              <li>• 80% PV performance ratio</li>
              <li>• 80% battery depth of discharge</li>
              <li>• 90% inverter efficiency</li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Preliminary sizing, not an installation design. An engineer must verify surge, wiring and site conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
