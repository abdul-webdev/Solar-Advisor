import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { get, post, patch, del } from '../../services/api';
import { ConfirmModal, FormModal, Field, Badge, ErrorBanner, inputCls, btnPrimary } from '../../components/ui';

const EMPTY = { fact_code: '', title: '', category: 'Battery Technology', description: '', value_text: '', source: '', status: 'published' };

export default function AdminKnowledge() {
  const { setCrumb } = useOutletContext();
  const [facts, setFacts] = useState([]);
  const [appliances, setAppliances] = useState([]);
  const [tab, setTab] = useState('facts');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [toDelete, setToDelete] = useState(null);
  const [aptoDelete, setAptoDelete] = useState(null);
  const [apForm, setApForm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setCrumb('Knowledge management'); }, [setCrumb]);
  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const d = await get('/admin/knowledge');
      setFacts(d.facts);
      const a = await get('/appliances');
      setAppliances(a.appliances);
    } catch (e) { setError(e.message); }
  }

  function openNew() { setForm(EMPTY); setEditing('new'); }
  function openEdit(f) { setForm({ ...f }); setEditing(f.id); }

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (!payload.fact_code) delete payload.fact_code;
      if (editing === 'new') await post('/admin/knowledge', payload);
      else await patch(`/admin/knowledge/${editing}`, payload);
      setEditing(null); load();
    } catch (err) { setError(err.message); }
  }

  async function confirmDelete() {
    try { await del(`/admin/knowledge/${toDelete.id}`); setToDelete(null); load(); }
    catch (err) { setError(err.message); }
  }

  async function saveAppliance(e) {
    e.preventDefault();
    try {
      if (apForm.id) await patch(`/admin/appliances/${apForm.id}`, apForm);
      else await post('/admin/appliances', apForm);
      setApForm(null); load();
    } catch (err) { setError(err.message); }
  }

  const filtered = facts.filter((f) =>
    !search || `${f.title} ${f.fact_code} ${f.category} ${f.description}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-[28px]">Knowledge management</h1>
          <p className="mt-1 text-[15px] text-muted">
            Approved engineering facts and appliance wattage references used by the expert system.
            <span className="ml-1 font-medium text-primary">Administrator access: full create, edit and delete.</span>
          </p>
        </div>
        <button onClick={tab === 'facts' ? openNew : () => setApForm({ name: '', category: 'general', wattage_w: 100, typical_hours_per_day: 4, is_essential: 1, description: '' })} className={btnPrimary}>
          <Plus className="h-4 w-4" /> {tab === 'facts' ? 'Add knowledge fact' : 'Add appliance'}
        </button>
      </div>
      <ErrorBanner message={error} />

      <div className="mt-5 flex gap-1 rounded-lg bg-appbg p-1 text-sm font-medium">
        {[['facts', `Knowledge facts (${facts.length})`], ['appliances', `Appliance catalogue (${appliances.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-md px-4 py-2 ${tab === k ? 'bg-white text-navy shadow-card' : 'text-muted'}`}>{l}</button>
        ))}
      </div>

      {tab === 'facts' && (
        <>
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search facts…" className={`${inputCls} pl-10`} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-appbg"><tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-semibold">Fact ID</th><th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Category</th><th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className="border-t border-line/70">
                    <td className="px-5 py-3 font-mono text-xs text-primary">{f.fact_code}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-navy">{f.title}</p>
                      <p className="line-clamp-1 max-w-md text-xs text-muted">{f.description}</p>
                    </td>
                    <td className="px-5 py-3 text-muted">{f.category}</td>
                    <td className="px-5 py-3"><Badge tone={f.status === 'published' ? 'green' : 'gray'}>{f.status}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(f)} title="Edit" className="rounded-md p-2 text-muted hover:bg-lightblue hover:text-primary"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setToDelete(f)} title="Delete" className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No matching knowledge facts.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'appliances' && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-appbg"><tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-5 py-3 font-semibold">Appliance</th><th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Wattage</th><th className="px-5 py-3 font-semibold">Typical hours</th>
              <th className="px-5 py-3 font-semibold">Backup</th><th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr></thead>
            <tbody>
              {appliances.map((a) => (
                <tr key={a.id} className="border-t border-line/70">
                  <td className="px-5 py-3 font-medium text-navy">{a.name}</td>
                  <td className="px-5 py-3 text-muted">{a.category}</td>
                  <td className="px-5 py-3 text-navy">{a.wattage_w} W</td>
                  <td className="px-5 py-3 text-navy">{a.typical_hours_per_day} h</td>
                  <td className="px-5 py-3"><Badge tone={a.is_essential ? 'green' : 'gray'}>{a.is_essential ? 'Essential' : 'Non-essential'}</Badge></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setApForm({ ...a })} title="Edit" className="rounded-md p-2 text-muted hover:bg-lightblue hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setAptoDelete(a)} title="Delete" className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal open={editing !== null} title={editing === 'new' ? 'New knowledge fact' : 'Edit knowledge fact'}
        subtitle={editing === 'new' ? 'Knowledge base / new record' : `Knowledge base / ${form.fact_code}`}
        onClose={() => setEditing(null)} onSubmit={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fact ID"><input value={form.fact_code || ''} onChange={(e) => setForm({ ...form, fact_code: e.target.value })} className={inputCls} placeholder="KB-BAT-012 (auto if blank)" /></Field>
          <Field label="Category"><input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} /></Field>
          <Field label="Title" className="sm:col-span-2"><input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea required rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field>
          <Field label="Technical value" className="sm:col-span-2"><input value={form.value_text || ''} onChange={(e) => setForm({ ...form, value_text: e.target.value })} className={inputCls} placeholder="e.g. 51.2 V nominal · 280 Ah" /></Field>
          <Field label="Source"><input value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} className={inputCls} placeholder="Manufacturer datasheet" /></Field>
          <Field label="Status">
            <select value={form.status || 'published'} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              <option value="published">Published</option><option value="draft">Draft</option>
            </select>
          </Field>
        </div>
      </FormModal>

      <FormModal open={!!apForm} title={apForm?.id ? 'Edit appliance' : 'New appliance'}
        subtitle="Appliance catalogue / wattage reference" onClose={() => setApForm(null)} onSubmit={saveAppliance}>
        {apForm && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input required value={apForm.name} onChange={(e) => setApForm({ ...apForm, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Category"><input value={apForm.category} onChange={(e) => setApForm({ ...apForm, category: e.target.value })} className={inputCls} /></Field>
            <Field label="Wattage (W)"><input type="number" min="1" required value={apForm.wattage_w} onChange={(e) => setApForm({ ...apForm, wattage_w: Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Typical hours/day"><input type="number" min="0.5" step="0.5" value={apForm.typical_hours_per_day} onChange={(e) => setApForm({ ...apForm, typical_hours_per_day: Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Backup priority" className="sm:col-span-2">
              <select value={apForm.is_essential ? 1 : 0} onChange={(e) => setApForm({ ...apForm, is_essential: Number(e.target.value) })} className={inputCls}>
                <option value={1}>Essential — included in backup sizing</option>
                <option value={0}>Non-essential — excluded during outages</option>
              </select>
            </Field>
            <Field label="Description" className="sm:col-span-2"><input value={apForm.description || ''} onChange={(e) => setApForm({ ...apForm, description: e.target.value })} className={inputCls} /></Field>
          </div>
        )}
      </FormModal>

      <ConfirmModal open={!!toDelete} title="Delete selected record?"
        message={`This permanently removes ${toDelete?.fact_code || 'the selected fact'} from the active database. Review dependent rules before continuing. This action cannot be undone.`}
        onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
      <ConfirmModal open={!!aptoDelete} title="Delete selected record?"
        message={`This permanently removes ${aptoDelete?.name} from the appliance catalogue. New consultations will no longer recognise it. This action cannot be undone.`}
        onConfirm={async () => { try { await del(`/admin/appliances/${aptoDelete.id}`); setAptoDelete(null); load(); } catch (e) { setError(e.message); } }}
        onCancel={() => setAptoDelete(null)} />
    </div>
  );
}
