import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FlaskConical, Play, CheckCircle2, AlertTriangle } from 'lucide-react';
import { post } from '../../services/api';
import { ErrorBanner, Badge, inputCls } from '../../components/ui';

const EXAMPLE = 'I have a two-bedroom house with 4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine. I need backup for around 8 hours.';

export default function AdminTestRules() {
  const { setCrumb } = useOutletContext();
  const [text, setText] = useState(EXAMPLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCrumb('Test expert rules'); }, [setCrumb]);

  async function run(e) {
    e.preventDefault();
    setBusy(true); setError(''); setResult(null);
    try {
      const d = await post('/admin/test-rules', { text });
      setResult(d);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const rec = result?.recommendation;
  const ext = result?.extraction;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Test expert rules</h1>
        <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Sandbox · no user impact</span>
      </div>
      <p className="mt-1 text-[15px] text-muted">Inspect extraction, intermediate calculations and the complete inference trace.</p>
      <ErrorBanner message={error} />

      <form onSubmit={run} className="mt-5 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-navy">Sample user requirements</span>
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className={inputCls} />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark disabled:opacity-50">
            <Play className="h-4 w-4" /> {busy ? 'Running…' : 'Run Inference Engine'}
          </button>
          <button type="button" onClick={() => setText(EXAMPLE)} className="text-sm font-semibold text-primary hover:underline">Load example</button>
          {rec && <span className="text-sm text-muted">Completed in {Math.round(rec.duration_ms)} ms</span>}
        </div>
        {rec?.defaulted_backup && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
            No backup target was found in the text, so the sandbox used an 8-hour default for this test run.
          </p>
        )}
      </form>

      {result && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h3 className="text-lg font-bold text-navy">Extracted facts</h3>
              <p className="text-xs text-muted">{ext.appliances.length} appliance categories · {ext.backup_hours} hour backup target</p>
              <div className="mt-3 space-y-2">
                {ext.appliances.map((a) => (
                  <div key={a.name} className="flex items-center justify-between text-sm">
                    <span className="text-navy">{a.name}</span>
                    <span className="text-muted">{a.quantity} × {a.wattage_w} W</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Connected load</span><span className="font-semibold text-navy">{Math.round(rec.total_load_w).toLocaleString()} W</span></div>
                <div className="flex justify-between"><span className="text-muted">Daily energy</span><span className="font-semibold text-navy">{rec.daily_energy_kwh.toFixed(2)} kWh</span></div>
                <div className="flex justify-between"><span className="text-muted">Essential load</span><span className="font-semibold text-navy">{Math.round(rec.essential_load_w).toLocaleString()} W</span></div>
              </div>
            </div>

            <div className="rounded-2xl bg-navy p-6 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Final recommendation</p>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-300">Solar array</span><span className="font-bold">{(rec.pv_capacity_wp / 1000).toFixed(1)} kWp</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Inverter</span><span className="font-bold">{rec.inverter_capacity_kw} kW / {rec.battery_voltage_v} V</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Battery bank</span><span className="font-bold">{(rec.battery_energy_wh / 1000).toFixed(2)} kWh</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Usable backup</span><span className="font-bold">~{rec.estimated_backup_hours} h</span></div>
                <div className="flex justify-between border-t border-navy2 pt-2"><span className="text-slate-300">Target</span>
                  <span className={`font-bold ${rec.estimated_backup_hours >= rec.backup_hours_target ? 'text-success' : 'text-amber-400'}`}>
                    {rec.backup_hours_target} h · {rec.estimated_backup_hours >= rec.backup_hours_target ? 'met' : 'short'}
                  </span></div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy">Inference execution trace</h3>
            <p className="text-xs text-muted">{rec.trace.length} rules evaluated · {rec.triggered_rules.length} triggered · {Math.round(rec.duration_ms)} ms</p>
            <div className="mt-4 space-y-3">
              {rec.trace.map((t, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-line px-4 py-3">
                  <span className="text-xs font-bold text-muted">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-primary">{t.rule_code}</span>
                      <span className="text-sm font-semibold text-navy">{t.name}</span>
                      <Badge tone={t.triggered ? 'green' : 'gray'}>{t.triggered ? 'Triggered' : 'Not triggered'}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{t.triggered ? t.explanation : t.condition_detail || 'Condition not met.'}</p>
                  </div>
                  {t.triggered && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-green-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" /> No conflicting conclusions</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-navy">
                Connected load is not average demand. Non-essential appliances are excluded during backup. Assumptions require user confirmation and an installer site assessment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
