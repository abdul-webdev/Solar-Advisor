import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, ShieldCheck, Info } from 'lucide-react';
import { get, patch } from '../../services/api';
import { ErrorBanner, InfoModal, inputCls } from '../../components/ui';

const NUMERIC = [
  { k: 'peak_sun_hours', l: 'Peak sun hours', unit: 'hours/day', step: 0.1 },
  { k: 'pv_performance_ratio', l: 'PV performance ratio', unit: '0–1', step: 0.01 },
  { k: 'inverter_safety_margin', l: 'Inverter safety margin', unit: '0–1', step: 0.01 },
  { k: 'battery_dod', l: 'Battery planning depth of discharge', unit: '0–1', step: 0.01 },
  { k: 'inverter_efficiency', l: 'Conservative inverter efficiency', unit: '0–1', step: 0.01 },
  { k: 'solar_array_reserve', l: 'Solar array reserve', unit: '0–1', step: 0.01 },
];

export default function AdminSettings() {
  const { setCrumb } = useOutletContext();
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCrumb('System settings'); }, [setCrumb]);
  useEffect(() => {
    get('/settings').then((d) => setSettings(d.settings)).catch((e) => setError(e.message));
    get('/admin/stats').then((d) => setStats(d.stats)).catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const d = await patch('/admin/settings', settings);
      setSettings(d.settings);
      setSaved(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!settings) return <p className="text-muted">Loading settings…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-[28px]">System settings</h1>
      <p className="mt-1 text-[15px] text-muted">Configure engineering defaults, access policies and system governance.</p>
      <ErrorBanner message={error} />

      <form onSubmit={save} className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy">Engineering defaults</h3>
            <p className="text-sm text-muted">Applied to every new consultation. Existing recommendations are unchanged.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {NUMERIC.map((f) => (
                <label key={f.k} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-navy">{f.l}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" step={f.step} value={settings[f.k] ?? ''}
                      onChange={(e) => setSettings({ ...settings, [f.k]: e.target.value })} className={inputCls} />
                    <span className="shrink-0 text-xs text-muted">{f.unit}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy">Access &amp; security</h3>
            <div className="mt-4 space-y-4">
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-navy">Allow public account registration</span>
                  <span className="block text-xs text-muted">New accounts are always created with the General User role.</span>
                </span>
                <select value={settings.allow_registration === 'true' ? 'true' : 'false'}
                  onChange={(e) => setSettings({ ...settings, allow_registration: e.target.value })}
                  className="w-28 rounded-lg border border-line bg-white px-3 py-2 text-sm">
                  <option value="true">Enabled</option><option value="false">Disabled</option>
                </select>
              </label>
              <div className="rounded-lg bg-appbg px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-navy"><ShieldCheck className="h-4 w-4 text-success" /> Server-side RBAC is always enforced</p>
                <p className="mt-1 text-xs text-muted">
                  General users receive 403 responses on all /api/admin/* endpoints regardless of UI state. Passwords are hashed with Werkzeug PBKDF2.
                </p>
              </div>
            </div>
          </div>

          <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primarydark disabled:opacity-50">
            <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy">System information</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ['Knowledge base', `${settings.knowledge_version} · ${stats?.knowledge_facts ?? '—'} facts`],
                ['Inference engine', `${settings.rules_version} · ${stats?.rules ?? '—'} deterministic rules`],
                ['NLP extractor', `${settings.nlp_version} · pattern + dictionary`],
                ['Recommendations', `${stats?.recommendations ?? 0} stored`],
                ['Inference traces', `${stats?.traces ?? 0} recorded`],
                ['Database', 'SQLite (local file)'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted">{k}</dt><dd className="text-right font-medium text-navy">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy">Role permissions</h3>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-primary">General user</p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted">
              <li>• Chat consultations</li><li>• Personal reports</li><li>• Published knowledge · read-only</li>
            </ul>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-primary">Administrator / Solar expert</p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted">
              <li>• All knowledge &amp; rule CRUD</li><li>• Equipment management &amp; rule testing</li><li>• User access &amp; system monitoring</li>
            </ul>
          </div>

          <div className="flex gap-2 rounded-2xl bg-lightblue p-5">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-navy">
              Updated defaults apply to new consultations only. Recalculate an existing report by starting a new consultation.
            </p>
          </div>
        </div>
      </form>

      <InfoModal open={saved} title="Settings saved" onClose={() => setSaved(false)}
        message="Updated engineering defaults will apply to new consultations only. Existing recommendations remain unchanged." />
    </div>
  );
}
