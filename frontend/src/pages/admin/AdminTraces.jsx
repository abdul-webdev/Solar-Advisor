import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, Activity } from 'lucide-react';
import { get } from '../../services/api';
import { Badge, EmptyState, ErrorBanner } from '../../components/ui';

export default function AdminTraces() {
  const { setCrumb } = useOutletContext();
  const [traces, setTraces] = useState([]);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setCrumb('Inference traces'); }, [setCrumb]);
  useEffect(() => {
    get('/admin/traces').then((d) => setTraces(d.traces)).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Inference trace viewer</h1>
      <p className="mt-1 text-[15px] text-muted">Every recommendation and sandbox run stores its facts, fired rules and reasoning steps.</p>
      <ErrorBanner message={error} />

      <div className="mt-5 space-y-3">
        {!traces.length && <EmptyState title="No inference runs recorded" message="Generate a recommendation or run the rule sandbox to populate traces." />}
        {traces.map((t) => (
          <div key={t.id} className="rounded-2xl border border-line bg-white shadow-card">
            <button onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lightblue">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{t.input_text || 'Rule sandbox run'}</p>
                  <p className="text-xs text-muted">
                    Trace #{t.id} · {t.run_type} · {t.trace?.length || 0} rules evaluated · {Math.round(t.duration_ms)} ms · {t.created_at}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={t.run_type === 'test' ? 'amber' : 'green'}>{t.run_type}</Badge>
                <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open === t.id ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {open === t.id && (
              <div className="border-t border-line px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Triggered rules</p>
                <p className="mt-1 text-sm text-navy">{t.triggered_rules?.join(' · ') || 'None'}</p>

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">Facts</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.entries(t.facts || {}).map(([k, v]) => (
                    <span key={k} className="rounded-md bg-appbg px-2 py-1 font-mono text-[11px] text-navy">{k}={String(v)}</span>
                  ))}
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">Execution trace</p>
                <div className="mt-1.5 space-y-1.5">
                  {(t.trace || []).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[13px]">
                      <span className="w-6 shrink-0 text-muted">{String(i + 1).padStart(2, '0')}</span>
                      <span className={`w-16 shrink-0 font-bold ${s.triggered ? 'text-primary' : 'text-slate-400'}`}>{s.rule_code}</span>
                      <span className="flex-1 text-navy">{s.triggered ? s.explanation || s.name : `not triggered — ${s.condition_detail}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
