import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import { get, post, patch, del } from '../../services/api';
import { ConfirmModal, FormModal, Field, Badge, ErrorBanner, inputCls, btnPrimary } from '../../components/ui';

const OPERATORS = [
  ['gte', '≥ greater than or equal'], ['gt', '> greater than'], ['lte', '≤ less than or equal'],
  ['lt', '< less than'], ['eq', '= equals'], ['neq', '≠ not equal'], ['between', 'between (needs value 2)'],
];
const ACTION_TYPES = [
  ['recommend_inverter', 'Recommend inverter'], ['recommend_pv', 'Recommend PV array'],
  ['recommend_battery', 'Recommend battery'], ['check_surge', 'Check start-up surge'],
  ['note', 'Informational note'], ['warning', 'Warning'],
];
const FIELDS = ['appliance_count', 'total_load_w', 'daily_energy_wh', 'essential_load_w', 'backup_hours_target',
  'has_motor_load', 'required_inverter_w', 'inverter_capacity_kw', 'pv_required_wp', 'pv_capacity_wp',
  'pv_panel_count', 'battery_required_wh', 'peak_sun_hours', 'pv_ratio', 'dod', 'inv_eff'];

const EMPTY = {
  rule_code: '', name: '', category: 'inverter', priority: 100, condition_field: 'total_load_w',
  operator: 'gte', threshold_value: 0, threshold_value2: '', action_type: 'note', action_value: '',
  description: '', explanation_template: '', is_active: 1,
};

export default function AdminRules() {
  const { setCrumb } = useOutletContext();
  const [rules, setRules] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setCrumb('Rule management'); }, [setCrumb]);
  useEffect(() => { load(); }, []);

  async function load() {
    try { const d = await get('/rules'); setRules(d.rules); }
    catch (e) { setError(e.message); }
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, priority: Number(form.priority), threshold_value: Number(form.threshold_value) };
    if (payload.threshold_value2 === '' || payload.threshold_value2 == null) payload.threshold_value2 = null;
    else payload.threshold_value2 = Number(payload.threshold_value2);
    try {
      if (editing === 'new') await post('/admin/rules', payload);
      else await patch(`/admin/rules/${editing}`, payload);
      setEditing(null); load();
    } catch (err) { setError(err.message); }
  }

  async function toggle(r) {
    try { await patch(`/admin/rules/${r.id}`, { is_active: r.is_active ? 0 : 1 }); load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Rule management</h1>
          <p className="mt-1 text-[15px] text-muted">IF-THEN rules are evaluated in priority order against extracted facts. Lower priority number runs first.</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditing('new'); }} className={btnPrimary}><Plus className="h-4 w-4" /> Create rule</button>
      </div>
      <ErrorBanner message={error} />

      <div className="mt-5 space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="rounded-md bg-lightblue px-2.5 py-1 text-xs font-bold text-primary">{r.rule_code}</span>
                <div>
                  <p className="text-[15px] font-bold text-navy">{r.name}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{r.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                <button onClick={() => toggle(r)} title={r.is_active ? 'Disable rule' : 'Enable rule'} className="rounded-md p-2 text-muted hover:bg-appbg"><Power className="h-4 w-4" /></button>
                <button onClick={() => { setForm({ ...r, threshold_value2: r.threshold_value2 ?? '' }); setEditing(r.id); }} title="Edit" className="rounded-md p-2 text-muted hover:bg-lightblue hover:text-primary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setToDelete(r)} title="Delete" className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-appbg px-4 py-2.5 text-xs text-muted">
              <span><span className="font-semibold text-navy">IF</span> {r.condition_field} {r.operator} {r.threshold_value}{r.threshold_value2 != null ? ` and ${r.threshold_value2}` : ''}</span>
              <span><span className="font-semibold text-navy">THEN</span> {r.action_type} · {r.action_value || '—'}</span>
              <span><span className="font-semibold text-navy">Priority</span> {r.priority}</span>
              <span><span className="font-semibold text-navy">Category</span> {r.category}</span>
            </div>
          </div>
        ))}
      </div>

      <FormModal open={editing !== null} title={editing === 'new' ? 'Create expert rule' : 'Edit expert rule'}
        subtitle={`Expert rules / ${form.rule_code || 'new'}`} onClose={() => setEditing(null)} onSubmit={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rule code"><input required value={form.rule_code} onChange={(e) => setForm({ ...form, rule_code: e.target.value })} className={inputCls} placeholder="INV-004" /></Field>
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} /></Field>
          <Field label="Rule name" className="sm:col-span-2"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Inverter continuous-load margin" /></Field>

          <p className="sm:col-span-2 mt-1 text-xs font-bold uppercase tracking-wider text-primary">IF condition</p>
          <Field label="Fact field">
            <select value={form.condition_field} onChange={(e) => setForm({ ...form, condition_field: e.target.value })} className={inputCls}>
              {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Operator">
            <select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} className={inputCls}>
              {OPERATORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Threshold value"><input type="number" step="any" required value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: e.target.value })} className={inputCls} /></Field>
          <Field label="Second threshold (optional)"><input type="number" step="any" value={form.threshold_value2} onChange={(e) => setForm({ ...form, threshold_value2: e.target.value })} className={inputCls} /></Field>

          <p className="sm:col-span-2 mt-1 text-xs font-bold uppercase tracking-wider text-primary">THEN action</p>
          <Field label="Action type">
            <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })} className={inputCls}>
              {ACTION_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Action value"><input value={form.action_value || ''} onChange={(e) => setForm({ ...form, action_value: e.target.value })} className={inputCls} placeholder="load x 1.25" /></Field>
          <Field label="Priority (lower runs first)"><input type="number" required value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls} /></Field>
          <Field label="Active">
            <select value={form.is_active ? 1 : 0} onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })} className={inputCls}>
              <option value={1}>Active</option><option value={0}>Inactive</option>
            </select>
          </Field>
          <Field label="Rule description (shown in reports)" className="sm:col-span-2">
            <textarea required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Explanation template" className="sm:col-span-2">
            <input value={form.explanation_template || ''} onChange={(e) => setForm({ ...form, explanation_template: e.target.value })} className={inputCls}
              placeholder="{total_load_w} W × 1.25 = {required_inverter_w} W → {inverter_capacity_kw} kW" />
            <span className="mt-1 block text-xs text-muted">Available fields: {FIELDS.join(', ')}</span>
          </Field>
        </div>
      </FormModal>

      <ConfirmModal open={!!toDelete} title="Delete selected record?"
        message={`This permanently removes rule ${toDelete?.rule_code}. Recommendations generated afterwards will no longer include this reasoning step. This action cannot be undone.`}
        onConfirm={async () => { try { await del(`/admin/rules/${toDelete.id}`); setToDelete(null); load(); } catch (e) { setError(e.message); } }}
        onCancel={() => setToDelete(null)} />
    </div>
  );
}
