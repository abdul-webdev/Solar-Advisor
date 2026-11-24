import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Users, FileText, BookOpen, SlidersHorizontal, Database, Activity, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { get } from '../../services/api';
import { Badge, EmptyState, ErrorBanner } from '../../components/ui';

export default function AdminDashboard() {
  const { setCrumb } = useOutletContext();
  const [data, setData] = useState(null);
  const [traces, setTraces] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { setCrumb('Dashboard'); }, [setCrumb]);
  useEffect(() => {
    get('/admin/stats').then(setData).catch((e) => setError(e.message));
    get('/admin/traces').then((d) => setTraces(d.traces)).catch(() => {});
  }, []);

  const stats = data?.stats;
  const cards = stats ? [
    { icon: Users, label: 'Registered users', value: stats.users, sub: `${stats.admins} experts` },
    { icon: FileText, label: 'Recommendations', value: stats.recommendations, sub: `${stats.traces} inference runs` },
    { icon: BookOpen, label: 'Knowledge facts', value: stats.knowledge_facts, sub: 'Published + draft' },
    { icon: SlidersHorizontal, label: 'Expert rules', value: stats.rules, sub: `${stats.active_rules} active` },
    { icon: Database, label: 'Equipment records', value: stats.equipment, sub: 'Panels · inverters · batteries' },
    { icon: Activity, label: 'Contact messages', value: stats.contact_messages, sub: 'Support queue' },
  ] : [];

  const chartData = (data?.recent_recommendations || []).slice().reverse().map((r) => ({
    name: r.reference?.replace('SA-2025-', '#'),
    load: Math.round(r.total_load_w),
    pv: Math.round(r.pv_capacity_wp),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Expert console dashboard</h1>
      <p className="mt-1 text-[15px] text-muted">Monitor consultations, review inference activity and manage approved knowledge.</p>
      <ErrorBanner message={error} />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lightblue">
              <c.icon className="h-[18px] w-[18px] text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold text-navy">{c.value}</p>
            <p className="text-xs font-medium text-navy">{c.label}</p>
            <p className="mt-0.5 text-[11px] text-muted">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold text-navy">Recent consultation sizing</h3>
          <p className="text-sm text-muted">Connected load vs. recommended PV capacity per generated recommendation.</p>
          <div className="mt-4 h-64">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="load" name="Connected load (W)" stroke="#2563EB" fill="url(#gLoad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="pv" name="PV array (Wp)" stroke="#16A34A" fill="url(#gPv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No consultations yet" message="Recommendations generated in the chat advisor appear here." />}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy">Quick actions</h3>
            <div className="mt-3 space-y-2">
              {[
                { to: '/admin/test-rules', label: 'Test expert rules' },
                { to: '/admin/knowledge', label: 'Add knowledge fact' },
                { to: '/admin/rules', label: 'Create IF-THEN rule' },
                { to: '/admin/equipment', label: 'Equipment database' },
              ].map((a) => (
                <Link key={a.to} to={a.to} className="flex items-center justify-between rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-navy hover:bg-appbg">
                  {a.label} <ArrowRight className="h-4 w-4 text-primary" />
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-lightblue p-5">
            <h3 className="text-[15px] font-bold text-navy">Deterministic by design</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-navy">
              Every recommendation is produced by database rules and documented formulas — no AI model invents engineering specifications.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold text-navy">Recent recommendations</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-semibold">Ref</th><th className="py-2 pr-3 font-semibold">Home</th>
                <th className="py-2 pr-3 font-semibold">Load</th><th className="py-2 font-semibold">PV</th>
              </tr></thead>
              <tbody>
                {(data?.recent_recommendations || []).map((r) => (
                  <tr key={r.id} className="border-b border-line/60">
                    <td className="py-2.5 pr-3 font-medium text-primary">{r.reference}</td>
                    <td className="py-2.5 pr-3 text-navy">{r.household_context || 'Home'}</td>
                    <td className="py-2.5 pr-3 text-navy">{Math.round(r.total_load_w)} W</td>
                    <td className="py-2.5 text-navy">{Math.round(r.pv_capacity_wp)} Wp</td>
                  </tr>
                ))}
                {!data?.recent_recommendations?.length && <tr><td colSpan={4} className="py-6 text-center text-muted">No recommendations yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy">Latest inference traces</h3>
            <Link to="/admin/traces" className="text-sm font-semibold text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-3 space-y-2">
            {traces.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-appbg px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy">{t.input_text || 'Rule sandbox run'}</p>
                  <p className="text-[11px] text-muted">{t.run_type} run · {t.trace?.length || 0} rules · {Math.round(t.duration_ms)} ms</p>
                </div>
                <Badge tone={t.run_type === 'test' ? 'amber' : 'green'}>{t.triggered_rules?.length || 0} fired</Badge>
              </div>
            ))}
            {!traces.length && <p className="py-4 text-center text-sm text-muted">No inference runs recorded yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
