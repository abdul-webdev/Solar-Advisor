import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { BookOpen, Search, ArrowRight, Send, CheckCircle2 } from 'lucide-react';
import { get, post, patch } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Badge, EmptyState, ErrorBanner, InfoModal, inputCls, btnPrimary } from '../components/ui';

export function KnowledgeBase() {
  const { setCrumb } = useOutletContext();
  const [facts, setFacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setCrumb('Knowledge Base'); }, [setCrumb]);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      const d = await get(`/knowledge?${params.toString()}`);
      setFacts(d.facts);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, [category]);
  useEffect(() => { get('/knowledge/categories').then((d) => setCategories(d.categories)).catch(() => {}); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Knowledge Base</h1>
      <p className="mt-1 text-[15px] text-muted">Approved expert knowledge that powers the advisor. Read-only for general users.</p>
      <ErrorBanner message={error} />
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search knowledge…" className={`${inputCls} pl-10`} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={load} className={btnPrimary}>Search</button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {facts.length === 0 && <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No facts found" message="Try a different search or category." /></div>}
        {facts.map((f) => (
          <div key={f.id} className="rounded-2xl border border-line bg-white p-5 shadow-card fade-up">
            <div className="flex items-center justify-between gap-2">
              <Badge tone="blue">{f.category}</Badge>
              <span className="text-xs font-medium text-muted">{f.fact_code}</span>
            </div>
            <h3 className="mt-3 text-[15px] font-bold text-navy">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.description}</p>
            {f.value_text && <p className="mt-3 rounded-lg bg-appbg px-3 py-2 text-[13px] font-medium text-navy">{f.value_text}</p>}
            {f.source && <p className="mt-2 text-xs text-muted">Source: {f.source}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const { setCrumb } = useOutletContext();
  useEffect(() => { setCrumb('How It Works'); }, [setCrumb]);
  const steps = [
    { n: '01', t: 'Describe your needs', d: 'Type your appliances, quantities and backup hours in plain language — no forms or ranges to pick from.' },
    { n: '02', t: 'NLP extraction', d: 'The extractor identifies appliances, quantities, wattages, usage hours and backup targets using patterns and the appliance dictionary.' },
    { n: '03', t: 'Clarification, not guessing', d: 'If backup hours or appliances are missing, the advisor asks follow-up questions before calculating anything.' },
    { n: '04', t: 'Engineering calculations', d: 'Connected load, daily energy, inverter margin, PV capacity and battery energy are computed with transparent, documented formulas.' },
    { n: '05', t: 'Rule-based inference', d: 'Database-driven IF-THEN rules (INV, PV, BAT, SUR…) are evaluated in priority order. Every triggered rule is recorded.' },
    { n: '06', t: 'Explainable recommendation', d: 'You receive sized inverter, PV array and battery — with the full reasoning trace, assumptions and safety disclaimers.' },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">How It Works</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">A genuine rule-based expert system: knowledge base, inference engine, calculation engine and explanation facility — working together on every consultation.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <span className="text-sm font-bold text-primary">{s.n}</span>
            <h3 className="mt-2 text-base font-bold text-navy">{s.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-lightblue p-6">
        <h3 className="text-[15px] font-bold text-navy">Important limitation</h3>
        <p className="mt-2 text-sm leading-relaxed text-navy">
          Thresholds are configurable educational defaults. Final engineering sizing requires verified appliance ratings, surge requirements,
          site conditions and local installation standards. This tool never replaces a qualified installer&apos;s site assessment.
        </p>
        <Link to="/advisor" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Start a consultation <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

const FAQS = [
  { q: 'How accurate is the sizing?', a: 'Estimates use nameplate wattages and typical duty cycles from the knowledge base. They are suitable for planning and budgeting, not for final installation. Confirm actual ratings before purchasing equipment.' },
  { q: 'What does "essential load" mean?', a: 'Essential loads are appliances that should keep running during an outage — lighting, refrigerator, fans and communications. Heavy loads such as washers, dryers and water heaters are excluded from backup sizing by default.' },
  { q: 'Why does the advisor ask follow-up questions?', a: 'Backup duration and appliance lists are never guessed. If information is missing, the advisor asks — for example, how many hours of backup you need — before running any calculations.' },
  { q: 'Can I change the engineering assumptions?', a: 'Administrators can adjust peak sun hours, performance ratio, depth of discharge, inverter efficiency and safety margins in System settings. Changes apply to new consultations.' },
  { q: 'Is my consultation data private?', a: 'Yes. Recommendations and chat history are tied to your account. General users can only see their own data; administrators manage the knowledge base, rules and equipment — not your private consultations.' },
  { q: 'What should I do before installation?', a: 'Have a qualified installer verify surge ratings, roof shading, wiring, protection devices, earthing and local electrical standards. Bring your recommendation report to the site visit.' },
];

export function FAQs() {
  const { setCrumb } = useOutletContext();
  const [open, setOpen] = useState(0);
  useEffect(() => { setCrumb('FAQs'); }, [setCrumb]);
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Frequently asked questions</h1>
      <p className="mt-1 text-[15px] text-muted">Practical answers about the advisor, sizing and safety.</p>
      <div className="mt-6 space-y-3">
        {FAQS.map((f, i) => (
          <div key={f.q} className="rounded-2xl border border-line bg-white shadow-card">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between px-6 py-4 text-left">
              <span className="text-[15px] font-semibold text-navy">{f.q}</span>
              <span className="text-primary">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{f.a}</p>}
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-lightblue p-6">
        <h3 className="text-[15px] font-bold text-navy">Still have a question?</h3>
        <p className="mt-1 text-sm text-muted">Browse the knowledge base or contact the solar team.</p>
        <div className="mt-3 flex gap-3">
          <Link to="/knowledge" className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-appbg"><BookOpen className="h-4 w-4" /> Knowledge Base</Link>
          <Link to="/contact" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primarydark">Contact us <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  );
}

export function Contact() {
  const { setCrumb } = useOutletContext();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCrumb('Contact'); }, [setCrumb]);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await post('/contact', form);
      setSent(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Contact our solar team</h1>
      <p className="mt-1 text-[15px] text-muted">Get help with the advisor, understand a recommendation or speak to a solar expert.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold text-navy">How can I help?</h3>
          <ErrorBanner message={error} />
          <div className="mt-5 space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy">Full name</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Alex Morgan" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy">Email address</span>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="alex.morgan@example.com" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy">Subject</span>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} placeholder="Question about recommendation SA-2025-042" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy">Your message</span>
              <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls} placeholder="I'd like to confirm which appliances are included in my backup plan." /></label>
          </div>
          <p className="mt-3 text-xs text-muted">Never include account passwords or private electrical access details.</p>
          <button disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark disabled:opacity-50">
            {busy ? 'Sending…' : <>Send message <Send className="h-4 w-4" /></>}
          </button>
        </form>
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy">Expert support</h3>
            <p className="mt-3 text-sm font-semibold text-primary">support@solaradvisor.example</p>
            <p className="mt-3 text-sm text-muted">Monday – Friday<br />09:00 – 17:00</p>
            <p className="mt-3 text-sm text-muted">Typical reply within 1 business day.</p>
            <p className="mt-3 text-xs leading-relaxed text-muted">For an electrical emergency, isolate safely and contact local emergency services.</p>
          </div>
          <div className="rounded-2xl bg-lightblue p-6">
            <h3 className="text-[15px] font-bold text-navy">Find an answer sooner</h3>
            <p className="mt-1.5 text-sm text-muted">Browse practical solar questions or ask the conversational advisor.</p>
            <Link to="/faqs" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-appbg">Explore FAQs <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
      <InfoModal open={sent} title="Message sent"
        message={`Thank you, ${user?.name || 'friend'}. Your message is in the solar support queue. I aim to respond within one business day.`}
        onClose={() => { setSent(false); setForm({ name: user?.name || '', email: user?.email || '', subject: '', message: '' }); }} />
    </div>
  );
}

export function AccountSettings() {
  const { setCrumb } = useOutletContext();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', location: user?.location || '' });
  const [emailReport, setEmailReport] = useState(true);
  const [metric, setMetric] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setCrumb('Account settings'); }, [setCrumb]);

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      await patch('/auth/me', form);
      setSaved(true);
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Account settings</h1>
      <p className="mt-1 text-[15px] text-muted">Manage your personal information and consultation preferences.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <form onSubmit={save} className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold text-navy">Personal information</h3>
          <ErrorBanner message={error} />
          <div className="mt-5 space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy">Full name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Alex Morgan" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy">Email address</span>
              <input value={user?.email || ''} disabled className={`${inputCls} bg-appbg text-muted`} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy">Location / time zone</span>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} placeholder="Lagos, Nigeria · UTC +01:00" /></label>
          </div>
          <h3 className="mt-8 text-lg font-bold text-navy">Consultation preferences</h3>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between text-sm text-navy">
              Email me when a report is ready
              <input type="checkbox" checked={emailReport} onChange={(e) => setEmailReport(e.target.checked)} className="h-5 w-5 accent-primary" />
            </label>
            <label className="flex items-center justify-between text-sm text-navy">
              Use metric units (W, kWh, V, Ah)
              <input type="checkbox" checked={metric} onChange={(e) => setMetric(e.target.checked)} className="h-5 w-5 accent-primary" />
            </label>
          </div>
          <button className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark">Save changes</button>
        </form>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold text-navy">Your access</h3>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-primary">General user</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Conversational consultations</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Personal recommendation reports</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Approved knowledge, read only</li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">Your account cannot edit expert rules, knowledge facts or equipment records.</p>
        </div>
      </div>
      <InfoModal open={saved} title="Changes saved"
        message="Your account preferences have been updated successfully. Your existing recommendations are unchanged."
        onClose={() => setSaved(false)} />
    </div>
  );
}
