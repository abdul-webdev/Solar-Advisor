import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { get, post, patch, del } from '../../services/api';
import { ConfirmModal, FormModal, Field, Badge, ErrorBanner, inputCls, btnPrimary } from '../../components/ui';

const SCHEMAS = {
  panels: {
    label: 'Solar panels',
    fields: [
      { k: 'manufacturer', l: 'Manufacturer', type: 'text', req: true },
      { k: 'model', l: 'Model', type: 'text', req: true },
      { k: 'wattage_w', l: 'Rated wattage (W)', type: 'number', req: true },
      { k: 'efficiency_pct', l: 'Module efficiency (%)', type: 'number' },
      { k: 'max_power_voltage_v', l: 'Maximum power voltage (V)', type: 'number' },
      { k: 'status', l: 'Verification status', type: 'select', options: ['verified', 'pending', 'retired'] },
    ],
    cols: [['model', 'Model'], ['wattage_w', 'Wattage (W)'], ['efficiency_pct', 'Efficiency %'], ['max_power_voltage_v', 'Vmp (V)'], ['status', 'Status']],
  },
  inverters: {
    label: 'Inverters',
    fields: [
      { k: 'manufacturer', l: 'Manufacturer', type: 'text', req: true },
      { k: 'model', l: 'Model', type: 'text', req: true },
      { k: 'capacity_kw', l: 'Rated capacity (kW continuous)', type: 'number', req: true },
      { k: 'dc_voltage_v', l: 'DC input voltage (V nominal)', type: 'number' },
      { k: 'ac_voltage_v', l: 'AC output voltage (V)', type: 'number' },
      { k: 'surge_kw', l: 'Surge rating (kW peak)', type: 'number' },
      { k: 'efficiency_pct', l: 'Conversion efficiency (%)', type: 'number' },
      { k: 'status', l: 'Verification status', type: 'select', options: ['verified', 'pending', 'retired'] },
    ],
    cols: [['model', 'Model'], ['capacity_kw', 'Capacity (kW)'], ['dc_voltage_v', 'DC V'], ['surge_kw', 'Surge (kW)'], ['efficiency_pct', 'Eff %'], ['status', 'Status']],
  },
  batteries: {
    label: 'Batteries',
    fields: [
      { k: 'manufacturer', l: 'Manufacturer', type: 'text', req: true },
      { k: 'model', l: 'Model', type: 'text', req: true },
      { k: 'technology', l: 'Technology', type: 'text' },
      { k: 'nominal_voltage_v', l: 'Nominal voltage (V)', type: 'number', req: true },
      { k: 'capacity_ah', l: 'Nominal capacity (Ah)', type: 'number', req: true },
      { k: 'depth_of_discharge_pct', l: 'Depth of discharge (%)', type: 'number' },
      { k: 'efficiency_pct', l: 'Round-trip efficiency (%)', type: 'number' },
      { k: 'cycle_life', l: 'Cycle life', type: 'number' },
      { k: 'status', l: 'Verification status', type: 'select', options: ['verified', 'pending', 'retired'] },
    ],
    cols: [['model', 'Model'], ['nominal_voltage_v', 'Voltage (V)'], ['capacity_ah', 'Capacity (Ah)'], ['depth_of_discharge_pct', 'DoD %'], ['efficiency_pct', 'Eff %'], ['cycle_life', 'Cycles'], ['status', 'Status']],
  },
};

export default function AdminEquipment() {
  const { setCrumb } = useOutletContext();
  const [kind, setKind] = useState('panels');
  const [data, setData] = useState({ panels: [], inverters: [], batteries: [] });
  const [form, setForm] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setCrumb('Equipment database'); }, [setCrumb]);
  useEffect(() => { load(); }, []);

  async function load() {
    try { setData(await get('/equipment')); }
    catch (e) { setError(e.message); }
  }

  const schema = SCHEMAS[kind];

  async function save(e) {
    e.preventDefault();
    const payload = {};
    schema.fields.forEach((f) => { if (form[f.k] !== '' && form[f.k] != null) payload[f.k] = typeCast(f, form[f.k]); });
    try {
      if (form.id) await patch(`/admin/equipment/${kind}/${form.id}`, payload);
      else await post(`/admin/equipment/${kind}`, payload);
      setForm(null); load();
    } catch (err) { setError(err.message); }
  }

  function typeCast(f, v) { return f.type === 'number' ? Number(v) : v; }

  function blank() {
    const o = {};
    schema.fields.forEach((f) => { o[f.k] = f.type === 'number' ? '' : f.type === 'select' ? f.options[0] : ''; });
    return o;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Equipment database</h1>
          <p className="mt-1 text-[15px] text-muted">Verified panels, inverters and batteries the inference engine may select.</p>
        </div>
        <button onClick={() => setForm(blank())} className={btnPrimary}><Plus className="h-4 w-4" /> Add {schema.label.toLowerCase().replace(/s$/, '')}</button>
      </div>
      <ErrorBanner message={error} />

      <div className="mt-5 flex gap-1 rounded-lg bg-appbg p-1 text-sm font-medium">
        {Object.entries(SCHEMAS).map(([k, v]) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-md px-4 py-2 ${kind === k ? 'bg-white text-navy shadow-card' : 'text-muted'}`}>
            {v.label} ({data[k]?.length || 0})
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-appbg"><tr className="text-left text-xs uppercase tracking-wider text-muted">
            <th className="px-5 py-3 font-semibold">Manufacturer</th>
            {schema.cols.map(([k, l]) => <th key={k} className="px-5 py-3 font-semibold">{l}</th>)}
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {(data[kind] || []).map((r) => (
              <tr key={r.id} className="border-t border-line/70">
                <td className="px-5 py-3">
                  <p className="font-medium text-navy">{r.manufacturer}</p>
                  <p className="text-xs text-muted">{r.model}</p>
                </td>
                {schema.cols.map(([k]) => (
                  <td key={k} className="px-5 py-3 text-navy">
                    {k === 'status' ? <Badge tone={r[k] === 'verified' ? 'green' : 'gray'}>{r[k]}</Badge> : (r[k] ?? '—')}
                  </td>
                ))}
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setForm({ ...r })} title="Edit" className="rounded-md p-2 text-muted hover:bg-lightblue hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setToDelete(r)} title="Delete" className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!data[kind]?.length && <tr><td colSpan={schema.cols.length + 2} className="px-5 py-8 text-center text-muted">No records yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <FormModal open={!!form} title={form?.id ? 'Equipment record editor' : 'New equipment record'}
        subtitle={`Equipment database / ${schema.label}`} onClose={() => setForm(null)} onSubmit={save}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            {schema.fields.map((f) => (
              <Field key={f.k} label={f.l}>
                {f.type === 'select' ? (
                  <select value={form[f.k] || f.options[0]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className={inputCls}>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} step="any" required={f.req} value={form[f.k] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className={inputCls} />
                )}
              </Field>
            ))}
            <p className="sm:col-span-2 rounded-lg bg-appbg px-4 py-3 text-xs leading-relaxed text-muted">
              Only the selected equipment type is saved. A site engineer must confirm wiring, protection, battery BMS and inverter compatibility before installation.
            </p>
          </div>
        )}
      </FormModal>

      <ConfirmModal open={!!toDelete} title="Delete selected record?"
        message={`This permanently removes ${toDelete?.manufacturer} ${toDelete?.model} from the equipment database. The inference engine will no longer select it. This action cannot be undone.`}
        onConfirm={async () => { try { await del(`/admin/equipment/${kind}/${toDelete.id}`); setToDelete(null); load(); } catch (e) { setError(e.message); } }}
        onCancel={() => setToDelete(null)} />
    </div>
  );
}
