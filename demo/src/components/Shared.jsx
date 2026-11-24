import { Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const n0 = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const kwh = (wh) => (Number(wh) / 1000).toFixed(2);
export const ONE = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
};

export function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-line bg-white p-6 shadow-card ${className}`}>{children}</div>;
}

export function Modal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
          <Check className="h-7 w-7 text-success" />
        </div>
        <h3 className="text-2xl font-bold text-navy">{title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{message}</p>
        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primarydark">Done</button>
        </div>
      </div>
    </div>
  );
}

export function RecommendationCards({ rec }) {
  const cards = [
    { v: `${(rec.total_load_w / 1000).toFixed(2)} kW`, l: 'Connected load' },
    { v: `${kwh(rec.daily_energy_wh)} kWh`, l: 'Daily energy¹' },
    { v: `${ONE(rec.inverter_capacity_kw)} kW`, l: 'Inverter capacity' },
    { v: `${(rec.pv_capacity_wp / 1000).toFixed(1)} kWp`, l: `Solar array · ${rec.pv_panel_count} × ${ONE(rec.pv_panel_wattage_w)} W` },
    { v: `${kwh(rec.battery_energy_wh)} kWh`, l: `Battery · ${ONE(rec.battery_voltage_v)} V / ${ONE(rec.battery_capacity_ah)} Ah` },
    { v: `~${ONE(rec.estimated_backup_hours)} hours`, l: 'Essential-load backup²' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.l} className="rounded-xl border border-line bg-appbg px-4 py-3.5">
          <p className="text-xl font-bold text-navy">{c.v}</p>
          <p className="mt-0.5 text-xs text-muted">{c.l}</p>
        </div>
      ))}
    </div>
  );
}

export function Explanation({ rec }) {
  return (
    <div className="mt-5">
      <h4 className="text-[15px] font-bold text-navy">Why these recommendations?</h4>
      <div className="mt-2 space-y-1.5">
        {rec.explanation.split('\n').filter(Boolean).map((line, i) => (
          <p key={i} className="text-[13px] leading-relaxed text-muted">{line}</p>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {rec.triggered_rules.map((r) => (
          <span key={r} className="rounded-md bg-lightblue px-2 py-0.5 text-[11px] font-semibold text-primary">{r}</span>
        ))}
      </div>
    </div>
  );
}

export function TraceTable({ trace }) {
  return (
    <div className="space-y-2">
      {trace.map((t) => (
        <div key={t.step} className={`rounded-xl border px-4 py-3 ${t.triggered ? 'border-line bg-white' : 'border-line/60 bg-appbg/60'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted">{String(t.step).padStart(2, '0')}</span>
            <span className={`text-xs font-bold ${t.triggered ? 'text-primary' : 'text-slate-400'}`}>{t.rule_code}</span>
            <span className="text-sm font-semibold text-navy">{t.name}</span>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${t.triggered ? 'bg-green-50 text-success' : 'bg-slate-100 text-muted'}`}>
              {t.triggered ? 'Triggered' : 'Not triggered'}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            {t.triggered ? t.explanation : `Condition not met — ${t.condition_detail}`}
          </p>
        </div>
      ))}
    </div>
  );
}

export function LoadChart({ rec }) {
  const data = rec.appliances.map((a) => ({
    name: a.name.length > 14 ? `${a.name.slice(0, 13)}…` : a.name,
    watts: a.quantity * a.wattage_w,
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
          <Tooltip formatter={(v) => [`${v} W`, 'Connected load']} />
          <Bar dataKey="watts" fill="#2563EB" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
